function FindProxyForURL(url, host) {
  if (shExpMatch(host, "*.inno.local") || shExpMatch(host, "*.innodev.local")) {
    // Use the WSL proxy (replace WSL_IP and port with your WSL IP and proxy port)
    return "PROXY inno-proxy:3128"; // WSL IP and Squid port
  }

  return "DIRECT";
}
