const Service = require('./Service/index')
const axios = require('axios')
const store = require('../store')
const { hexToNumber } = require('web3-utils')

const SYNC_CHECK_INTERVAL = 3000

class Geth extends Service {
  constructor (options) {
    super('geth', options)
    this.syncCheckInterval = null
  }

  start () {
    this.on('ready', () => {
      // Get config values
      const { mode, networkId } = store('main.clients.geth')
      const networkFlag = this._getNetworkFlag(networkId)

      // Prepare client arguments
      let args = ['--networkid', networkId, '--syncmode', mode, '--nousb', '--rpc']
      if (networkFlag) args.push(networkFlag)

      // Start client
      this._run(args)

      // Check if syncing every <INTERVAL>
      this.syncCheckInterval = setInterval(() => this._syncCheck(), SYNC_CHECK_INTERVAL)
    })
    this._start()
  }

  stop () {
    // Terminate service
    this._stop()
    // Clear sync check interval
    clearInterval(this.syncCheckInterval)
  }

  async _syncCheck () {
    let state

    // Check using JSON RPC method 'eth_blockNumber'
    if (await this._getBlockNumber() === 0) state = 'syncing'

    // Check using JSON RPC method 'eth_syncing'
    else state = await this._isSyncing() ? 'syncing' : 'ready'

    // If state has changed -> update client state
    if (state !== store('main.clients.geth.state')) {
      store.setClientState('geth', state)
    }
  }

  async _isSyncing () {
    // RPC message
    const message = { jsonrpc: '2.0', id: 1, method: 'eth_syncing', params: [] }

    // Make HTTP request
    const res = await axios.post('http://127.0.0.1:8545', message)

    // Get sync status
    return res.data.result !== false
  }

  async _getBlockNumber () {
    // RPC message
    const message = { jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }

    // Make HTTP request
    const res = await axios.post('http://127.0.0.1:8545', message)

    // Return block number as integer
    return hexToNumber(res.data.result)
  }

  _getNetworkFlag (id) {
    if (id === '1') return null
    if (id === '3') return '--testnet'
    if (id === '4') return '--rinkeby'
  }
}

module.exports = new Geth()