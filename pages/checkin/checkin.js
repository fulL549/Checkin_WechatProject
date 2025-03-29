Page({
  data: {
    currentDate: '',
    hasCheckedIn: false,
    checkinTime: '',
    name: '',
    phone: '',
    remark: '',
    taskInfo: {
      title: '',
      description: '',
      deadline: ''
    },
    isViewMode: false,
    form: {
      name: '',
      phone: '',
      studentId: '',
      gender: 'male',
      location: '',
      content: '',
      remark: ''
    }
  },

  onLoad(options) {
    this.setCurrentDate();
    // 获取传递过来的任务ID和打卡状态
    const taskId = options.taskId;
    const isChecked = options.isChecked === 'true';
    
    // 这里应该根据taskId从服务器获取任务详情
    // 暂时使用模拟数据
    this.setData({
      taskInfo: {
        title: '示例任务',
        description: '这是一个示例任务描述',
        deadline: '2024-03-30'
      },
      hasCheckedIn: isChecked,
      checkinTime: isChecked ? '09:30' : ''
    });
  },

  setCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    this.setData({
      currentDate: `${year}-${month}-${day}`
    });
  },

  onNameInput(e) {
    this.setData({
      'form.name': e.detail.value
    });
  },

  onPhoneInput(e) {
    this.setData({
      'form.phone': e.detail.value
    });
  },

  onStudentIdInput(e) {
    this.setData({
      'form.studentId': e.detail.value
    });
  },

  onGenderChange(e) {
    this.setData({
      'form.gender': e.detail.value
    });
  },

  onLocationInput(e) {
    this.setData({
      'form.location': e.detail.value
    });
  },

  onContentInput(e) {
    this.setData({
      'form.content': e.detail.value
    });
  },

  onRemarkInput(e) {
    this.setData({
      'form.remark': e.detail.value
    });
  },

  handleCheckin() {
    // 这里添加表单验证逻辑
    if (!this.data.form.name || !this.data.form.phone || !this.data.form.studentId) {
      wx.showToast({
        title: '请填写必要信息',
        icon: 'none'
      });
      return;
    }

    // 这里添加提交打卡信息的逻辑
    wx.showLoading({
      title: '提交中...',
    });

    // 模拟提交
    setTimeout(() => {
      wx.hideLoading();
      this.setData({
        hasCheckedIn: true,
        checkinTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      });
      wx.showToast({
        title: '打卡成功',
        icon: 'success'
      });
    }, 1500);
  }
}); 