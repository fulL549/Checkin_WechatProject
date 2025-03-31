const cloud = require('../../utils/cloud.js')

Page({
  data: {
    rankingList: [],
    loading: true,
    userId: wx.getStorageSync('userInfo') ? wx.getStorageSync('userInfo')._id : ''
  },

  // 处理导航栏返回按钮点击
  onBackTap: function() {
    wx.navigateBack({
      delta: 1
    })
  },

  onLoad: function() {
    this.setData({
      userId: wx.getStorageSync('userInfo') ? wx.getStorageSync('userInfo')._id : ''
    })
    this.loadRanking()
  },

  onShow: function() {
    this.loadRanking()
  },

  onRefresh: function() {
    this.setData({ refreshing: true })
    this.loadRanking().finally(() => {
      this.setData({ refreshing: false })
    })
  },

  // 加载排行榜
  loadRanking: function() {
    if (!cloud || !cloud.checkin) {
      console.error('cloud module not properly loaded')
      return Promise.reject(new Error('cloud module not properly loaded'))
    }

    this.setData({ loading: true })
    return cloud.checkin.getRanking()
      .then(data => {
        console.log('排行榜数据:', data)
        this.setData({
          rankingList: data.list || [],
          loading: false
        })
      })
      .catch(err => {
        console.error('获取排行榜失败：', err)
        wx.showToast({
          title: '获取排行榜失败',
          icon: 'none'
        })
        this.setData({ loading: false })
        return Promise.reject(err)
      })
  }
}) 