const getDeviceInfo = (userAgent) => {
  const info = {
    device: 'Unknown',
    browser: 'Unknown',
    os: 'Unknown',
    deviceType: 'Desktop'
  };
  
  if (!userAgent) return info;
  
  const ua = userAgent.toLowerCase();
  
  // Detect Device Type
  if (/(tablet|ipad|playbook|kindle)/i.test(ua)) {
    info.deviceType = 'Tablet';
  } else if (/(mobile|iphone|ipod|android|blackberry|windows phone)/i.test(ua)) {
    info.deviceType = 'Mobile';
  } else {
    info.deviceType = 'Desktop';
  }
  
  // Detect Browser
  if (ua.includes('chrome') && !ua.includes('edg')) {
    info.browser = 'Chrome';
  } else if (ua.includes('firefox')) {
    info.browser = 'Firefox';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    info.browser = 'Safari';
  } else if (ua.includes('edg')) {
    info.browser = 'Edge';
  } else if (ua.includes('opera') || ua.includes('opr')) {
    info.browser = 'Opera';
  } else if (ua.includes('msie') || ua.includes('trident')) {
    info.browser = 'Internet Explorer';
  }
  
  // Detect OS
  if (ua.includes('windows')) {
    info.os = 'Windows';
  } else if (ua.includes('mac')) {
    info.os = 'MacOS';
  } else if (ua.includes('linux')) {
    info.os = 'Linux';
  } else if (ua.includes('android')) {
    info.os = 'Android';
  } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
    info.os = 'iOS';
  }
  
  // Detect Device Name
  if (ua.includes('iphone')) info.device = 'iPhone';
  else if (ua.includes('ipad')) info.device = 'iPad';
  else if (ua.includes('macbook')) info.device = 'MacBook';
  else if (ua.includes('windows')) info.device = 'Windows PC';
  else if (ua.includes('android')) info.device = 'Android Device';
  
  return info;
};

const formatDeviceInfo = (userAgent) => {
  const info = getDeviceInfo(userAgent);
  return `${info.device} (${info.deviceType}) - ${info.os} - ${info.browser}`;
};

module.exports = { getDeviceInfo, formatDeviceInfo };