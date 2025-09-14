// function.helpers.js
const moment = require('moment');
module.exports = {
  eq: (a, b) => a === b,
  df: (a, b) => a !== b,
  lt: (a, b) => a < b,
  gt: (a, b) => a > b,
  plus: (a, b) => a + b,
  minus: (a, b) => {
    return a - b;
  }, 
  repeat: function(count, options) {
    let result = '';
    for (let i = 0; i < count; i++) {
      result += options.fn(this);
    }
    return result;
  },
  formatDate: (date) => {
    return moment(date).format('DD-MM-YYYY');
  },
  formatDateTime: (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('vi-VN');
  },

  formatDateHour: (date) => {
    return moment(date).utcOffset(7).format('HH:mm DD-MM-YYYY');
  },
  formatCurrency: (amount) => {
    return amount.toLocaleString('it-IT', {style : 'currency', currency : 'VND'});
  },
  truncate: (str, length) => {
    if (str && str.length > length) {
      return str.substring(0, length) + '...';
    }
    return str;
  },
  percentage: function (value, total) {
  if (!total || total === 0) return 0;
  return Math.round((value / total) * 100);
  },

  formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Vừa xong';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
  }, 

  formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  },

  times: function(n, block) {
        let accum = '';
        for (let i = 0; i < n; ++i) {
            accum += block.fn(i);
        }
        return accum;
    },

    math: function(lvalue, operator, rvalue) {
        lvalue = parseFloat(lvalue);
        rvalue = parseFloat(rvalue);

        if (isNaN(lvalue) || isNaN(rvalue)) {
            return '';
        }

        switch (operator) {
            case '+':
                return lvalue + rvalue;
            case '-':
                return lvalue - rvalue;
            case '*':
                return lvalue * rvalue;
            case '/':
                return rvalue !== 0 ? lvalue / rvalue : '';
            default:
                return '';
        }
    },

    ifEquals: function(arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    },

    twoConditions: (cd1, cd2) => {
      if (cd1 === cd2 === true) {
        return true;
      }
      return false;
    },

    ifFirst: (index, options) => {
      if (index === 0) {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
    },

    getStatusText: function(status) {
      const statusMap = {
        'pending': 'Chờ xử lý',
        'confirmed': 'Đã xác nhận',
        'shipped': 'Đang giao',
        'delivered': 'Đã giao',
        'cancelled': 'Đã hủy'
      };
      return statusMap[status] || status;
    },

    getStatusClass: (status) => {
      return `status-${status}`;
    },

    canCancel: function(status) {
      if (status === ' ' || !status) {
        status = 'pending';
      };
      return ['ready_to_pick', 'picking', 'pending'].includes(status);
    },

    canTrack: (status) => {
      return status === 'shipped';
    },

    canReorder: function(status) {
      return ['delivered', 'cancelled'].includes(status);
    },

    getPaymentMethodText: function(paymentMethod, bankingMethod) {
      const bankingMethodMap = {
        'momo': 'Ví MoMo',
        'vnpay': 'VNPay',
      };

      if (paymentMethod === 'cod') {
        return 'Thanh toán khi nhận hàng'
      };

      if (paymentMethod === 'banking') {
        return bankingMethodMap[bankingMethod];
      };

      return 'Không xác định';
    },

    getPaymentStatusClass: function(status) {
      const classMap = {
        'pending': 'bg-warning text-dark',
        'delivered': 'bg-success text-white',
        'paid': 'bg-success text-white',
        'failed': 'bg-danger text-white',
        'cancelled': 'bg-secondary text-white',
      };
      return classMap[status] || 'bg-secondary text-white';
    },

    getPaymentStatusText: (status) => {
      const statusMap = {
        'pending': 'Chờ thanh toán',
        'paid': 'Đã thanh toán',
        'failed': 'Thanh toán thất bại',
        'refunded': 'Đã hoàn tiền'
    };
    return statusMap[status] || status;
    },

    default: (value, defaultValue) => {
      return value || defaultValue;
    },

    daysAgo: (date) => {
      if (!date) return '';
      const now = new Date();
      const orderDate = new Date(date);
      const diffTime = Math.abs(now - orderDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return '1 ngày trước';
      if (diffDays < 7) return `${diffDays} ngày trước`;
      if (diffDays < 30) return `${Math.ceil(diffDays / 7)} tuần trước`;
      return `${Math.ceil(diffDays / 30)} tháng trước`;
    },

    getStautsIcon: (status) => {
      const iconMap = {
        'pending': '⏳',
        'confirmed': '✅',
        'shipped': '🚚',
        'delivered': '📦',
        'cancelled': '❌'
      };
      return iconMap[status] || '📋';
    },

    formatOrderNumber: (number) => {
      if (!number) return '';
      return `#${String(number).padStart(6, '0')}`;
    },

    getOrderProgress: (status) => {
      const progressMap = {
        'pending': 20,
        'confirmed': 40,
        'shipped': 70,
        'delivered': 100,
        'cancelled': 0
      };
      return progressMap[status] || 0;
    },

    formatCompact: (num) => {
      if (!num) return '0';
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
      return num.toString();
    },

    length: (array) => {
      if (!Array.isArray(array)) return 0;
      return array.length;
    },

    add: (a, b) => {
      return (a || 0) + (b || 0);
    },

    multiply: (a, b) => {
      return (a || 0) * (b || 0);
    },

    divide: (a, b) => {
      return (a || 0) / (b || 0);
    },

    isOdd: (num) => {
      return num % 2 !== 0;
    },

    isEven: (num) => {
      return num % 2 === 0;
    },

    isActive: (isActive) => {
      return isActive === true;
    },

    isNotActive: (isActive) => {
      return isActive !== true;
    },

    range: (start, end) => {
      let result = [];

      if (typeof end === 'undefined') {
        end = start;
        start = 1;
      }

      for (let i = start; i < end; i++) {
        result.push(i);
    }
    
    return result;
    },

    substring: (str, start, end) => {
      if (!str || typeof str !== 'string') return '';
    
      // Nếu không có end, lấy từ start đến hết chuỗi
      if (typeof end === 'undefined') {
          return str.substring(start);
      }
      
      return str.substring(start, end);
    },

    times: (n, block) => {
      let result = '';
      for (let i = 0; i < n; i++) {
          result += block.fn(i);
      }
      return result;
    },

};