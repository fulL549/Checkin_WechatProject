Page({
  data: {
    title: '',
    description: '',
    deadline: ''
  },

  onTitleInput(e) {
    this.setData({
      title: e.detail.value
    });
  },

  onDescInput(e) {
    this.setData({
      description: e.detail.value
    });
  },

  onDateChange(e) {
    this.setData({
      deadline: e.detail.value
    });
  },

  submitTask() {
    const { title, description, deadline } = this.data;
    
    if (!title || !description || !deadline) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    // 这里可以添加提交任务到服务器的逻辑
    wx.showToast({
      title: '发布成功',
      icon: 'success',
      duration: 2000,
      success: () => {
        setTimeout(() => {
          wx.navigateBack();
        }, 2000);
      }
    });
  }
}); 