#!/bin/bash

# обновление пакетов
sudo apt-get update -y
sudo apt-get install -y

# установка sakura
curl -sLO https://github.com/crutch12/sakura/raw/refs/heads/main/sakura-agent-2.33.5.deb
sudo dpkg -i sakura-agent-2.33.5.deb
sudo systemctl enable sakura
# через 30-60 секунд можно проверить, что sakura работает: http://localhost:4567/test

# установка cisco anyconnect
sudo apt install -y unzip
curl -sLO https://github.com/crutch12/sakura/raw/refs/heads/main/anyconnect-linux64-4.10.01075.zip
unzip anyconnect-linux64-4.10.01075.zip -d "anyconnect-linux64-4.10.01075"
cd ./anyconnect-linux64-4.10.01075/anyconnect-linux64-4.10.01075/vpn && yes | sudo bash ./vpn_install.sh

# установка gui зависимостей для работы cisco anyconnect
sudo apt install -y libgtk-3-0 libwebkit2gtk-4.0-37

# установка и настройка squid сервера для проксирования трафика
sudo apt install -y squid
sudo wget https://github.com/crutch12/sakura/raw/refs/heads/main/squid.conf -O /etc/squid/squid.conf
sudo systemctl restart squid

# установка Google Chrome (на случай, если не знаем все DNS адреса и хотим просто через браузер посмотреть)
sudo apt install -y fonts-liberation libnspr4 libnss3 libvulkan1 xdg-utils
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb

# Готово
echo "Sakura, Squid and Cisco Anyconnect setup complete!!!"