const WebSocket = require('ws')
const uuid = require('uuid/v4')
const log = require('electron-log')

const provider = require('../provider')
const signers = require('../signers')
const store = require('../store')

const trusted = require('./trusted')
const validPayload = require('./validPayload')
const isFrameExtension = require('./isFrameExtension')

const subs = {}

const protectedMethods = ['eth_coinbase', 'eth_accounts', 'eth_sendTransaction', 'personal_sign', 'personal_ecRecover', 'eth_sign']

const handler = (socket, req) => {
  socket.id = uuid()
  socket.origin = req.headers.origin
  socket.isFrameExtension = isFrameExtension(req)
  const res = payload => {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(payload), err => { if (err) log.info(err) })
    }
  }
  socket.on('message', data => {
    let origin = socket.origin
    let payload = validPayload(data)
    if (!payload) return
    if (socket.isFrameExtension) { // Request from extension, swap origin
      if (payload.__frameOrigin) {
        origin = payload.__frameOrigin
        delete payload.__frameOrigin
      } else {
        origin = 'frame-extension'
      }
    }
    log.info('req -> | ' + (socket.isFrameExtension ? 'ext | ' : 'ws | ') + origin + ' | ' + payload.method + ' | -> | ' + payload.params)
    if (protectedMethods.indexOf(payload.method) > -1 && !trusted(origin)) {
      let error = { message: 'Permission denied, approve ' + origin + ' in Frame to continue', code: 4001 }
      if (!signers.getSelectedAccounts()[0]) error = { message: 'No Frame account selected', code: 4100 }
      res({ id: payload.id, jsonrpc: payload.jsonrpc, error })
    } else {
      provider.send(payload, response => {
        if (response && response.result) {
          if (payload.method === 'eth_subscribe') {
            subs[response.result] = { socket, origin }
          } else if (payload.method === 'eth_unsubscribe') {
            payload.params.forEach(sub => { if (subs[sub]) delete subs[sub] })
          }
        }
        log.info('<- res | ' + (socket.isFrameExtension ? 'ext | ' : 'ws | ') + origin + ' | ' + payload.method + ' | <- | ' + response.result || response.error)
        res(response)
      })
    }
  })
  socket.on('error', err => err) // Handle Error
  socket.on('close', _ => {
    Object.keys(subs).forEach(sub => {
      if (subs[sub].socket.id === socket.id) {
        provider.send({ jsonrpc: '2.0', id: 1, method: 'eth_unsubscribe', params: [sub] })
        delete subs[sub]
      }
    })
  })
}

module.exports = server => {
  const ws = new WebSocket.Server({ server })
  ws.on('connection', handler)
  // Send data to the socket that initiated the subscription
  provider.on('data', payload => {
    let subscription = subs[payload.params.subscription]
    if (subscription) subscription.socket.send(JSON.stringify(payload))
  })

  provider.on('data:accounts', (account, payload) => { // Make sure the subscription has access based on current account
    let subscription = subs[payload.params.subscription]
    if (subscription) {
      let permissions = store('main.accounts', account, 'permissions') || {}
      let perms = Object.keys(permissions).map(id => permissions[id])
      let allowed = perms.map(p => p.origin).indexOf(subscription.origin) > -1
      if (!allowed) payload.params.result = []
      subscription.socket.send(JSON.stringify(payload))
    }
  })

  // TODO: close -> notify
  // If we lose connection to our node, close connected sockets
  // provider.on('close', _ => ws.clients.forEach(socket => socket.close()))
  // When permission is revoked, close connected sockets
  // store.observer(() => {
  //   let permissions = store('local.accounts', store('signer.accounts', 0), 'permissions') || {}
  //   let ok = []
  //   Object.keys(permissions).forEach(key => { if (permissions[key].provider) ok.push(permissions[key].origin) })
  //   ws.clients.forEach(socket => { if (ok.indexOf(socket.origin) < 0) socket.close() })
  // })
  // When the current account changes, close connected sockets
  // let current = ''
  // store.observer(() => {
  //   if (store('signer.current') !== current) ws.clients.forEach(socket => socket.close())
  //   current = store('signer.current')
  // })
  // let local
  // let secondary
  // store.observer(() => {
  //   if (local === 'connected' && local !== store('main.connection.local.status')) {
  //     ws.clients.forEach(socket => socket.close())
  //   } else if (secondary === 'connected' && secondary !== store('main.connection.secondary.status')) {
  //     ws.clients.forEach(socket => socket.close())
  //   }
  //   local = store('main.connection.local.status')
  //   secondary = store('main.connection.secondary.status')
  // })

  return server
}
