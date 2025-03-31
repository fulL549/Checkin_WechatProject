const app = getApp()

Page({
  /**
   * 页面的初始数据
   */
  data: {
    members: [],
    filteredMembers: [],
    searchValue: '',
    totalMembers: 0,
    loading: true,
    userInfo: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.loadUserInfo()
    this.loadMembers()
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 队长模式已验证，无需重复检查
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    this.loadMembers(() => {
      wx.stopPullDownRefresh()
    })
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '查看团队队员列表',
      path: '/pages/index/index'
    }
  },

  /**
   * 返回上一页
   */
  onBackTap: function () {
    wx.navigateBack()
  },

  /**
   * 加载用户信息
   */
  loadUserInfo: function () {
    // 尝试从全局获取用户信息
    let userInfo = app.globalData.userInfo
    
    // 如果全局没有，则从本地存储获取
    if (!userInfo) {
      try {
        const value = wx.getStorageSync('userInfo')
        if (value) {
          userInfo = value
        }
      } catch (e) {
        console.error('读取用户信息失败', e)
      }
    }
    
    this.setData({
      userInfo
    })
  },

  /**
   * 加载所有队员列表
   */
  loadMembers: function (callback) {
    this.setData({ loading: true })
    
    console.log('开始加载用户列表')
    wx.cloud.callFunction({
      name: 'team',
      data: {
        action: 'getTeamMembers'
      }
    }).then(res => {
      console.log('获取用户列表结果:', res)
      
      if (res.result && res.result.data) {
        // 为每个成员添加显示所需的信息
        const members = res.result.data.map(member => {
          return {
            ...member,
            checkinCount: member.checkinCount || 0,
            studentId: member.studentId || '未设置学号'
          }
        })
        
        console.log('处理后的用户数据:', members.length)
        
        this.setData({
          members,
          filteredMembers: members,
          totalMembers: members.length,
          loading: false
        })
      } else {
        // 如果返回的结果没有data字段，记录详细信息
        console.error('获取用户列表返回异常:', res)
        
        this.setData({
          members: [],
          filteredMembers: [],
          totalMembers: 0,
          loading: false
        })
        
        wx.showToast({
          title: '获取用户列表失败: ' + (res.result?.message || '无数据'),
          icon: 'none',
          duration: 3000
        })
      }
      
      if (callback) callback()
    }).catch(err => {
      console.error('获取用户列表失败:', err)
      this.setData({ loading: false })
      
      wx.showToast({
        title: '获取用户列表失败: ' + (err.message || err.errMsg || '未知错误'),
        icon: 'none',
        duration: 3000
      })
      
      if (callback) callback()
    })
  },

  /**
   * 处理搜索输入
   */
  onSearchInput: function (e) {
    const searchValue = e.detail.value
    this.setData({ searchValue })
    this.filterMembers(searchValue)
  },

  /**
   * 处理搜索按钮点击
   */
  onSearchTap: function () {
    this.filterMembers(this.data.searchValue)
  },

  /**
   * 根据搜索词过滤成员列表
   */
  filterMembers: function (searchValue) {
    if (!searchValue) {
      this.setData({
        filteredMembers: this.data.members
      })
      return
    }
    
    const filteredMembers = this.data.members.filter(member => {
      // 按名称或学号搜索
      return (
        member.nickName.toLowerCase().includes(searchValue.toLowerCase()) ||
        (member.studentId && member.studentId.includes(searchValue))
      )
    })
    
    this.setData({ filteredMembers })
  },

  /**
   * 点击队员，查看其打卡记录
   */
  onMemberTap: function (e) {
    const memberId = e.currentTarget.dataset.id
    const memberName = e.currentTarget.dataset.nickname
    
    wx.navigateTo({
      url: `/pages/member-history/member-history?id=${memberId}&name=${memberName}`
    })
  }
}) 