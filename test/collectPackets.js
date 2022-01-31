/* eslint-env mocha */
const { collectPackets } = require('minecraft-wrap')
const nmp = require('minecraft-protocol')

describe('it can collect packets from server', function () {
  this.timeout(10 * 60 * 1000) // 1 min
  it('works on 1.18', (done) => {
    let collector
    collectPackets(nmp, '1.18', ['login'], (name, params) => {
      if (name === 'login') {
        console.log('✅ Got login')
        collector.finish()
        done()
      }
    }).catch(console.error).then(c => { collector = c })
  })
})
