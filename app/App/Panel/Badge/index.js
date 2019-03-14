import React from 'react'
import Restore from 'react-restore'
import link from '../../../link'

class Bridge extends React.Component {
  render () {
    if (this.store('view.badge') === 'updateReady') {
      return (
        <div className='badge' style={{ transform: 'translateY(0px)', height: '196px' }}>
          <div className='badgeInner'>
            <div className='badgeMessage'>
              {'Your update is ready and will be installed next restart'}
            </div>
            <div className='badgeInput'>
              <div className='badgeInputButton'>
                <div className='badgeInputInner' onMouseDown={() => this.store.updateBadge()}>{'Ok'}</div>
              </div>
            </div>
            <div className='badgeInput'>
              <div className='badgeInputButton'>
                <div className='badgeInputInner' onMouseDown={() => link.send('tray:updateRestart')}>{'Restart Now'}</div>
              </div>
            </div>
          </div>
        </div>
      )
    } else if (this.store('view.badge') === 'updateAvailable') {
      return (
        <div className='badge' style={{ transform: 'translateY(0px)', height: '224px' }}>
          <div className='badgeInner'>
            <div className='badgeMessage'>
              {'An update is available, would you like to install it?'}
            </div>
            <div className='badgeInput'>
              <div className='badgeInputButton'>
                <div className='badgeInputInner' onMouseDown={() => {
                  link.send('tray:installAvailableUpdate', true, false)
                }}>{'Yes'}</div>
              </div>
            </div>
            <div className='badgeInput'>
              <div className='badgeInputButton'>
                <div className='badgeInputInner' onMouseDown={() => {
                  link.send('tray:installAvailableUpdate', false, false)
                }}>{'No'}</div>
              </div>
            </div>
            <div className='badgeInput'>
              <div className='badgeInputButton'>
                <div className='badgeInputInner badgeInputSmall' onMouseDown={() => {
                  link.send('tray:installAvailableUpdate', false, true)
                }}>{'No & Don\'t remind me'}</div>
              </div>
            </div>
          </div>
        </div>
      )
    } else {
      return <div className='badge' />
    }
  }
}

export default Restore.connect(Bridge)
