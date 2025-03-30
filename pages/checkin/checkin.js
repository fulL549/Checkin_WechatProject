const cloud = require('../../utils/cloud')

Page({
  data: {
    taskId: '',
    task: null,
    form: {
      content: '',
      training: '',
      remark: '',
      date: new Date().toISOString().split('T')[0]
    },
    isView: false,
    userInfo: null,
    loading: false
  },

  // 处理导航栏返回按钮点击
  onBackTap: function() {
    wx.navigateBack({
      delta: 1
    })
  },

  onLoad: function(options) {
    console.log('打卡页面加载，参数:', options)
    
    if (!cloud || !cloud.task || !cloud.checkin) {
      console.error('cloud module not properly loaded')
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      })
      return
    }
    
    const taskId = options.id || ''
    const recordId = options.recordId || ''
    const isView = options.mode === 'view' || options.view === '1'
    
    this.setData({
      taskId,
      recordId,
      isView
    })
    
    // 设置当前日期
    this.setCurrentDate()
    
    // 加载用户信息
    this.loadUserInfo()
    
    // 如果是从历史记录直接进入，先加载打卡记录
    if (recordId) {
      this.loadCheckinRecordById(recordId)
    } 
    // 如果有任务ID，加载任务详情
    else if (taskId) {
      this.loadTaskDetail(taskId)
    }
  },

  // 设置当前日期
  setCurrentDate: function() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const today = `${year}-${month}-${day}`
    
    this.setData({
      'form.date': today
    })
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
    
    // 检查登录状态
    if (!userInfo || !userInfo._openid) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再打卡',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/profile/profile'
          })
        }
      })
    }
  },

  // 加载任务详情
  loadTaskDetail: function(taskId) {
    wx.showLoading({
      title: '加载中...'
    })
    
    cloud.task.getTaskDetail(taskId)
      .then(task => {
        console.log('获取到任务详情:', task)
        
        this.setData({ task })
        
        // 如果是查看模式，加载打卡记录
        if (this.data.isView) {
          this.loadCheckinRecord(taskId)
        }
        
        wx.hideLoading()
      })
      .catch(err => {
        console.error('获取任务详情失败:', err)
        
        wx.hideLoading()
        wx.showToast({
          title: '加载任务失败，请重试',
          icon: 'none'
        })
      })
  },

  // 加载打卡记录（查看模式）
  loadCheckinRecord: function(taskId) {
    if (!this.data.isView) return

    const recordId = this.data.recordId

    if (recordId) {
      // 如果有指定记录ID，直接加载该记录
      wx.showLoading({
        title: '加载记录中...'
      })

      // 调用云函数获取记录详情
      cloud.checkin.getCheckinDetail(recordId)
        .then(data => {
          wx.hideLoading()
          
          if (data) {
            // 设置表单数据
            this.setData({
              form: {
                content: data.content || '',
                training: data.training || '',
                remark: data.remark || '',
                date: data.date || this.data.form.date
              }
            })
          } else {
            wx.showToast({
              title: '加载记录失败',
              icon: 'none'
            })
          }
        })
        .catch(err => {
          console.error('获取打卡记录失败:', err)
          wx.hideLoading()
          wx.showToast({
            title: '加载记录失败',
            icon: 'none'
          })
        })
    } else {
      // 如果没有指定记录ID，检查今天是否已经打卡
      const today = new Date().toISOString().split('T')[0]
      
      wx.cloud.callFunction({
        name: 'checkin',
        data: {
          type: 'checkStatus',
          taskId: taskId,
          date: today
        }
      })
      .then(res => {
        if (res.result && res.result.code === 0 && res.result.data.hasCheckedIn && res.result.data.record) {
          // 设置表单数据
          this.setData({
            form: {
              content: res.result.data.record.content || '',
              training: res.result.data.record.training || '',
              remark: res.result.data.record.remark || '',
              date: res.result.data.record.date || this.data.form.date
            }
          })
        } else {
          // 没有找到记录，使用默认值
          this.setData({
            form: {
              content: '今天暂无打卡内容',
              training: '无训练记录',
              remark: '无备注信息',
              date: today
            }
          })
        }
      })
      .catch(err => {
        console.error('检查打卡状态失败:', err)
        // 出错时使用默认值
        this.setData({
          form: {
            content: '获取失败，请重试',
            training: '',
            remark: '',
            date: today
          }
        })
      })
    }
  },

  // 通过记录ID加载打卡记录
  loadCheckinRecordById: function(recordId) {
    wx.showLoading({
      title: '加载记录中...'
    })

    // 调用云函数获取记录详情
    cloud.checkin.getCheckinDetail(recordId)
      .then(data => {
        console.log('获取到打卡记录:', data)
        
        // 设置表单数据
        this.setData({
          form: {
            content: data.content || '',
            training: data.training || '',
            remark: data.remark || '',
            date: data.date || this.data.form.date
          },
          taskId: data.taskId || ''
        })
        
        // 如果记录包含任务ID，加载任务详情
        if (data.taskId) {
          this.loadTaskDetail(data.taskId)
        } else {
          wx.hideLoading()
        }
      })
      .catch(err => {
        console.error('获取打卡记录失败:', err)
        wx.hideLoading()
        wx.showToast({
          title: '加载记录失败',
          icon: 'none'
        })
      })
  },

  // 日期选择变化
  onDateChange: function(e) {
    this.setData({
      'form.date': e.detail.value
    })
  },

  // 内容输入变化
  onContentInput: function(e) {
    this.setData({
      'form.content': e.detail.value
    })
  },

  // 训练内容输入变化
  onTrainingInput: function(e) {
    this.setData({
      'form.training': e.detail.value
    })
  },

  // 备注输入变化
  onRemarkInput: function(e) {
    this.setData({
      'form.remark': e.detail.value
    })
  },

  // 提交打卡
  handleSubmit: function() {
    if (this.data.loading) return
    
    // 检查用户是否已登录
    if (!this.data.userInfo || !this.data.userInfo._openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    // 表单验证
    if (!this.data.form.content.trim()) {
      wx.showToast({
        title: '请填写打卡内容',
        icon: 'none'
      })
      return
    }

    if (!this.data.form.training.trim()) {
      wx.showToast({
        title: '请填写训练内容',
        icon: 'none'
      })
      return
    }

    if (!this.data.form.remark.trim()) {
      wx.showToast({
        title: '请填写备注信息',
        icon: 'none'
      })
      return
    }
    
    this.setData({ loading: true })
    wx.showLoading({ title: '提交中...' })
    
    // 准备打卡数据
    const checkinData = {
      taskId: this.data.taskId,
      content: this.data.form.content,
      training: this.data.form.training,
      remark: this.data.form.remark,
      date: this.data.form.date,
      userInfo: {
        openId: this.data.userInfo._openid,
        nickName: this.data.userInfo.nickName,
        avatarUrl: this.data.userInfo.avatarUrl
      }
    }
    
    cloud.checkin.submitCheckin(checkinData)
      .then(() => {
        wx.hideLoading()
        this.setData({ loading: false })
        
        wx.showToast({
          title: '打卡成功',
          icon: 'success'
        })
        
        // 延迟返回
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      })
      .catch(err => {
        console.error('打卡失败:', err)
        wx.hideLoading()
        this.setData({ loading: false })
        
        wx.showToast({
          title: err.message || '打卡失败',
          icon: 'none'
        })
      })
  }
}) 