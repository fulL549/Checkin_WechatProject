const cloud = require('../../utils/cloud')

Page({
  data: {
    historyList: [],
    totalCount: 0,
    loading: false,
    refreshing: false,
    page: 1,
    pageSize: 10,
    hasMore: true
  },

  onLoad: function() {
    console.log('历史记录页面加载')
    wx.showLoading({
      title: '加载中...',
      mask: true
    })
    this.loadHistoryData(true).finally(() => {
      wx.hideLoading()
    })
  },

  onShow: function() {
    // 如果需要每次显示页面都刷新，可以取消下面这行的注释
    // this.loadHistoryData(true)
  },

  // 处理下拉刷新
  onPullDownRefresh: function() {
    this.setData({ 
      refreshing: true,
      page: 1
    })
    this.loadHistoryData(true)
      .finally(() => {
        this.setData({ refreshing: false })
      })
  },

  // 处理上拉加载更多
  onReachBottom: function() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreHistory()
    }
  },

  // 加载打卡历史数据
  loadHistoryData: function(refresh = false) {
    if (!cloud || !cloud.checkin) {
      console.error('cloud module not properly loaded')
      return Promise.reject(new Error('cloud module not properly loaded'))
    }

    this.setData({ loading: true })

    // 如果是刷新，重置页码
    const page = refresh ? 1 : this.data.page

    return cloud.checkin.getUserHistory(page, this.data.pageSize)
      .then(data => {
        console.log('获取历史数据成功:', data)
        const list = data.list || []
        
        this.setData({
          historyList: refresh ? list : [...this.data.historyList, ...list],
          totalCount: data.total || 0,
          hasMore: data.hasMore,
          page,
          loading: false
        })
      })
      .catch(err => {
        console.error('获取打卡历史失败：', err)
        wx.showToast({
          title: '获取历史记录失败',
          icon: 'none',
          duration: 2000
        })
        this.setData({ 
          loading: false,
          historyList: refresh ? [] : this.data.historyList
        })
        return Promise.reject(err)
      })
  },

  // 加载更多历史记录
  loadMoreHistory: function() {
    if (!this.data.hasMore || this.data.loading) return

    this.setData({
      page: this.data.page + 1,
      loading: true
    })

    this.loadHistoryData(false)
  },

  // 点击历史记录项
  onHistoryItemTap: function(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    
    console.log('点击打卡记录:', id)
    
    // 修改为使用recordId参数而不是id参数
    wx.navigateTo({
      url: `/pages/checkin/checkin?recordId=${id}&mode=view`
    })
  },

  // 处理导航栏返回按钮点击
  onBackTap: function() {
    wx.navigateBack({
      delta: 1
    })
  }
}) 