// index.js
const cloud = require('../../utils/cloud')

Page({
  data: {
    tasks: [],
    currentTab: 0,
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    refreshing: false,
    userInfo: null,
    userTasks: {} // 记录用户已参与的任务
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    console.log('首页加载 - onLoad')
    
    // 检查页面访问权限，但添加日志以便调试
    const app = getApp()
    const hasPermission = app.checkPagePermission('pages/index/index')
    console.log('首页权限检查结果:', hasPermission)
    
    if (!hasPermission) {
      console.log('首页没有访问权限，将返回')
      return  // 如果没有权限，直接返回
    }
    
    console.log('开始加载首页内容')
    // 页面正常加载逻辑
    this.setData({
      selectedDate: this.formatDate(new Date())
    });
    
    // 加载打卡任务列表
    this.loadTasks();
  },

  onShow: function() {
    // 每次页面显示时刷新数据
    this.loadUserInfo() // 重新加载用户信息，以防在其他页面已登录
    this.setData({
      tasks: [],
      page: 1,
      hasMore: true
    })
    this.loadTasks()
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
    
    // 如果用户已登录，获取参与过的任务
    if (userInfo && userInfo._id) {
      this.loadUserTasks()
    }
  },
  
  // 加载用户参与的任务
  loadUserTasks: function() {
    // 这里可以请求获取用户已参与的任务列表
    // 简化处理：实际项目中应当通过云函数查询用户参与的任务
    const userTasks = wx.getStorageSync('userTasks') || {}
    this.setData({ userTasks })
  },

  onPullDownRefresh: function() {
    this.setData({
      tasks: [],
      page: 1,
      hasMore: true,
      refreshing: true
    })
    this.loadTasks()
  },

  onReachBottom: function() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadTasks()
    }
  },

  // 加载任务列表
  loadTasks: function() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    if (!cloud || !cloud.task) {
      // 如果云函数模块未加载，使用模拟数据
      const mockTasks = [
        {
          _id: '1',
          title: '每日打卡',
          description: '每天完成打卡任务',
          points: 10,
          deadline: '2024-12-31',
          status: '进行中'
        },
        {
          _id: '2',
          title: '运动打卡',
          description: '每天运动30分钟',
          points: 20,
          deadline: '2024-12-31',
          status: '进行中'
        }
      ]

      setTimeout(() => {
        this.setData({
          tasks: [...this.data.tasks, ...mockTasks],
          loading: false,
          refreshing: false,
          hasMore: false
        })
        wx.stopPullDownRefresh()
      }, 500)
      return
    }

    // 使用云函数获取任务列表
    cloud.task.getTaskList(this.data.page, this.data.pageSize)
      .then(res => {
        const newTasks = res.list || []
        const hasMore = newTasks.length === this.data.pageSize
        
        // 处理任务状态
        const processedTasks = newTasks.map(task => {
          // 检查用户是否参与了该任务
          const hasJoined = task.participants && task.participants.some(participant => participant === this.data.userInfo._id)
          
          return {
            ...task,
            hasJoined,
            // 根据截止日期判断任务是否已过期
            isExpired: task.deadline && new Date(task.deadline) < new Date()
          }
        })
        
        this.setData({
          tasks: [...this.data.tasks, ...processedTasks],
          page: this.data.page + 1,
          hasMore,
          loading: false,
          refreshing: false
        })
        
        wx.stopPullDownRefresh()
      })
      .catch(err => {
        console.error('获取任务列表失败:', err)
        this.setData({ 
          loading: false,
          refreshing: false
        })
        wx.showToast({
          title: '获取任务列表失败',
          icon: 'none'
        })
        wx.stopPullDownRefresh()
      })
  },

  // 切换底部导航
  switchTab: function(e) {
    const index = e.currentTarget.dataset.index
    if (index === this.data.currentTab) return
    
    this.setData({ currentTab: index })
    
    if (index === 1) {
      // 切换到排行榜
      wx.navigateTo({
        url: '/pages/ranking/ranking'
      })
    } else if (index === 2) {
      // 切换到发布任务
      wx.navigateTo({
        url: '/pages/task/task'
      })
    }
  },

  // 处理任务点击
  handleTaskClick: function(e) {
    // 检查用户是否已登录
    if (!this.data.userInfo || !this.data.userInfo._id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      
      // 跳转到个人中心页面进行登录
      wx.switchTab({
        url: '/pages/profile/profile'
      })
      return
    }
    
    const task = e.currentTarget.dataset.task
    
    // 导航到任务详情页
    wx.navigateTo({
      url: `/pages/task-detail/task-detail?id=${task._id}`
    })
  },

  // 参与任务
  joinTask: function(e) {
    // 阻止事件冒泡
    e.stopPropagation()
    
    // 检查用户是否已登录
    if (!this.data.userInfo || !this.data.userInfo._id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    const taskId = e.currentTarget.dataset.id
    if (!taskId) return
    
    wx.showLoading({
      title: '处理中...'
    })
    
    cloud.task.joinTask(taskId, this.data.userInfo._id)
      .then(() => {
        wx.hideLoading()
        
        // 更新本地任务参与状态
        const userTasks = this.data.userTasks || {}
        userTasks[taskId] = true
        wx.setStorageSync('userTasks', userTasks)
        
        // 更新UI
        const tasks = this.data.tasks.map(task => {
          if (task._id === taskId) {
            task.hasJoined = true
          }
          return task
        })
        
        this.setData({
          userTasks,
          tasks
        })
        
        wx.showToast({
          title: '参与成功',
          icon: 'success'
        })
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({
          title: err.message || '参与失败',
          icon: 'none'
        })
      })
  }
})
