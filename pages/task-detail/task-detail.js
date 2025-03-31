const cloud = require('../../utils/cloud')

Page({
  data: {
    taskId: '',
    task: null,
    userInfo: null,
    loading: true,
    isCreator: false,
    hasJoined: false,
    hasCheckedIn: false,
    checkinRecord: null,
    debugInfo: ''
  },

  // 处理导航栏返回按钮点击
  onBackTap: function() {
    wx.navigateBack({
      delta: 1
    })
  },

  onLoad: function(options) {
    console.log('任务详情页面加载，参数:', options)

    if (!cloud || !cloud.task) {
      console.error('cloud模块未正确加载')
      this.setData({
        debugInfo: 'cloud模块未正确加载'
      })
      wx.showToast({
        title: '系统错误，请重试',
        icon: 'none'
      })
      return
    }
    
    if (options.id) {
      this.setData({
        taskId: options.id
      })
      
      // 加载用户信息
      this.loadUserInfo()
      
      // 加载任务详情
      this.loadTaskDetail(options.id)
    } else {
      wx.showToast({
        title: '任务ID不存在',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 页面显示时刷新数据
  onShow: function() {
    // 如果已经加载了任务ID，重新检查打卡状态
    if (this.data.taskId) {
      this.checkCheckinStatus(this.data.taskId)
    }
  },

  // 加载用户信息
  loadUserInfo: function() {
    const app = getApp()
    let userInfo = app.globalData.userInfo
    
    if (!userInfo) {
      userInfo = wx.getStorageSync('userInfo') || null
      if (userInfo) {
        app.globalData.userInfo = userInfo
      }
    }
    
    this.setData({ userInfo })
  },

  // 加载任务详情 - 尝试直接使用云数据库查询
  loadTaskDetail: function(taskId) {
    wx.showLoading({
      title: '加载中...'
    })
    
    // 记录调试信息
    console.log('正在加载任务详情，ID:', taskId)
    
    // 尝试使用直接调用的方式
    wx.cloud.callFunction({
      name: 'task',
      data: {
        type: 'detail',
        taskId: taskId
      }
    })
    .then(res => {
      console.log('任务详情云函数返回:', res)
      
      if (res.result && res.result.code === 0 && res.result.data) {
        const task = res.result.data
        
        const userInfo = this.data.userInfo
        const isCreator = userInfo && userInfo._id === task.createdBy
        
        // 修改判断逻辑，确保使用正确的用户ID
        const hasJoined = task.participants && task.participants.some(participant => participant === userInfo._id)
        
        // 格式化时间
        if (task.createTime) {
          const date = new Date(task.createTime)
          task.createTimeFormatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
        }
        
        // 检查截止日期
        const isExpired = task.deadline && new Date(task.deadline) < new Date()
        
        this.setData({
          task,
          loading: false,
          isCreator,
          hasJoined,
          isExpired,
          debugInfo: '数据加载成功'
        })

        // 如果已登录且参与了任务，检查打卡状态
        if (hasJoined && userInfo && userInfo._id) {
          this.checkCheckinStatus(taskId)
        }
      } else {
        // 处理错误
        const errorMsg = (res.result && res.result.message) || '获取任务详情失败'
        console.error('云函数返回错误:', errorMsg)
        
        this.setData({
          loading: false,
          debugInfo: '云函数返回错误: ' + errorMsg
        })
        
        wx.showToast({
          title: errorMsg,
          icon: 'none'
        })
      }
      
      wx.hideLoading()
    })
    .catch(err => {
      console.error('调用云函数失败:', err)
      
      this.setData({
        loading: false,
        debugInfo: '调用云函数失败: ' + (err.message || JSON.stringify(err))
      })
      
      wx.hideLoading()
      wx.showToast({
        title: err.message || '获取任务详情失败',
        icon: 'none'
      })
    })
  },

  // 检查用户是否已打卡
  checkCheckinStatus: function(taskId) {
    if (!this.data.userInfo || !this.data.userInfo._id) {
      return // 未登录不检查
    }

    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    wx.cloud.callFunction({
      name: 'checkin',
      data: {
        type: 'checkStatus',
        taskId: taskId,
        date: dateStr,
        userId: this.data.userInfo._id
      }
    })
    .then(res => {
      console.log('检查打卡状态返回:', res)
      
      if (res.result && res.result.code === 0) {
        const hasCheckedIn = res.result.data.hasCheckedIn
        const checkinRecord = res.result.data.record || null
        
        this.setData({
          hasCheckedIn,
          checkinRecord
        })
      }
    })
    .catch(err => {
      console.error('检查打卡状态失败:', err)
    })
  },

  // 参与任务
  joinTask: function() {
    // 检查登录状态
    if (!this.data.userInfo || !this.data.userInfo._id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    const taskId = this.data.taskId
    
    wx.showLoading({
      title: '处理中...'
    })
    
    // 直接调用云函数
    wx.cloud.callFunction({
      name: 'task',
      data: {
        type: 'join',
        taskId: taskId,
        userId: this.data.userInfo._id
      }
    })
    .then(res => {
      wx.hideLoading()
      
      if (res.result && res.result.code === 0) {
        // 更新本地状态
        const userTasks = wx.getStorageSync('userTasks') || {}
        userTasks[taskId] = true
        wx.setStorageSync('userTasks', userTasks)
        
        this.setData({
          hasJoined: true,
          'task.participants': [...(this.data.task.participants || []), this.data.userInfo._id]
        })
        
        wx.showToast({
          title: '参与成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: (res.result && res.result.message) || '参与失败',
          icon: 'none'
        })
      }
    })
    .catch(err => {
      wx.hideLoading()
      wx.showToast({
        title: err.message || '参与失败',
        icon: 'none'
      })
    })
  },

  // 导航到打卡页面
  navigateToCheckin: function() {
    if (!this.data.hasJoined) {
      wx.showToast({
        title: '请先参与任务',
        icon: 'none'
      })
      return
    }
    
    // 如果已经打卡过，则查看打卡详情
    if (this.data.hasCheckedIn && this.data.checkinRecord) {
      wx.navigateTo({
        url: `/pages/checkin/checkin?id=${this.data.taskId}&view=1&recordId=${this.data.checkinRecord._id}`
      })
    } else {
      // 否则去打卡
      wx.navigateTo({
        url: `/pages/checkin/checkin?id=${this.data.taskId}`
      })
    }
  },

  // 返回列表
  goBack: function() {
    wx.navigateBack()
  }
}) 