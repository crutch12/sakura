Windows: WSL (Ubuntu) + Sakura + Cisco Anyconnect

> Проверялось на версиях Ubuntu
> - ubuntu:20.04
> - ubuntu:22.04

# Проблема и решение

- Проблема: для работы с inno.local нужно поставить NAC Сакура (которая имеет много доступа к системе)
- Решение: поднимаем WSL (linux внутри windows), туда устанавливаем NAC Сакура и Cisco Anyconnect, настраиваем проксирование трафика через WSL

# WSL

Всё от админа (наверное)

## Установка WSL (если не установлен)

> **Обязательно WSL версии 2!**

Для windows 10/11 сборка 19041 и выше

```sh
$ wsl --set-default-version 2
$ wsl --update
```

На более старых сборках: https://learn.microsoft.com/ru-ru/windows/wsl/install-manual)

## Установка wsl Ubuntu (если не установлена)

```sh
# полный список образов
$ wsl -l -o

# ставим "Ubuntu". Или если хотите поставить другую версию, то можно, например Ubuntu-20.04
$ wsl --install Ubuntu
# во время установки указываем логин/пароль (root/password)
```

## Настройка Ubuntu

Проваливаемся в установленную Ubuntu и устанавливаем все нужные пакеты (Sakura, Cisco, Google Chrome)

```sh
$ wsl -d Ubuntu sudo su -c "bash <(wget -qO- https://raw.githubusercontent.com/crutch12/sakura/refs/heads/main/setup.sh)" root
```

> Не останавливаем до сообщения "Sakura, Squid and Cisco Anyconnect setup complete!!!"

> Через 30-60 секунд можно проверить, что sakura работает: http://localhost:4567/test

> (!) **Если после старта команды ничего не происходит, то, скорее всего, дело в настройках DNS. Тогда сначала запускаем команду и пробуем ещё раз**
```sh
$ wsl -d Ubuntu sudo su -c "echo 'nameserver 8.8.8.8' > /etc/resolv.conf"
```

# Настройка proxy (с хоста)

## DNS (hosts файл)

Меняем файл (открываем от админа) `C:\Windows\System32\drivers\etc\hosts`
```
10.169.6.196 sfera.inno.local
10.169.7.247 git.sfera.inno.local
10.169.7.215 repo-ci.sfera.inno.local
10.169.7.215 npm.repo-ci.sfera.inno.local
10.234.156.183 curs-root-ui.dev.curs.apps.innodev.local api-gw.dev.curs.apps.innodev.local
# ...список ещё будет пополняться...
```

> Если встретили неизвестный домен, то можно получить его ip. Пример:
```sh
$ wsl -d Ubuntu dig +short git.sfera.inno.local
```

### Или меняем hosts через npm (мне так удобнее)

```sh
# запускать через admin powershell
$ npx -y hostile set 10.169.6.196 sfera.inno.local
$ npx -y hostile set 10.169.7.247 git.sfera.inno.local
$ npx -y hostile set 10.169.7.215 repo-ci.sfera.inno.local
$ npx -y hostile set 10.169.7.215 npm.repo-ci.sfera.inno.local
$ npx -y hostile set 10.234.156.183 "curs-root-ui.dev.curs.apps.innodev.local api-gw.dev.curs.apps.innodev.local"
```

## Proxy

Получаем ip адрес виртуальной машины

```sh
# через wsl вызов (берём ip, который слева)
$ wsl -d Ubuntu hostname -I

# или через wsl машину
$ wsl -d Ubuntu
$ ip addr show eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}'

# или через wsl машину в одну команду, но без grep
$ wsl -d Ubuntu ip addr show eth0
```

Полученный адрес (например `172.25.203.50`) используем в качестве прокси - `172.25.203.50:3128`

> (!) **Для удобства, сразу делаем для этого адреса domain имя (через hosts файл)**
```
# hosts файл
172.25.203.50 inno-proxy
```
**Теперь можно везде указывать `inno-proxy:3128`**

> При перезапуске есть шанс, что адрес поменяется. Тут есть инструкция по автонастройке ip для wsl машины
> https://gist.github.com/wllmsash/1636b86eed45e4024fb9b7ecd25378ce

### Как использовать прокси

1) Самый простой вариант (хотя бы проверить, что работает)

- Windows - Network & internet > Proxy > Manual proxy setup
- Указываем `inno-proxy:3128`

2) Или через .pac файл

- Windows - Network & internet > Proxy > Use setup script
- Указываем URL `https://raw.githubusercontent.com/crutch12/sakura/refs/heads/main/proxy.pac`

> Пример PAC файла для настройки proxy (с.м. https://learn.microsoft.com/en-us/previous-versions/troubleshoot/browsers/connectivity-navigation/optimize-pac-performance)
```js
function FindProxyForURL(url, host) {
  if (shExpMatch(host, "sfera.inno.local") || shExpMatch(host, "*.sfera.inno.local")) {
    // Use the WSL proxy (replace WSL_IP and port with your WSL IP and proxy port)
    return "PROXY inno-proxy:3128"; // WSL IP and Squid port
  }

  return "DIRECT";
}
```

3) Или настраиваем VPN на wsl машине (например wireguard) и ходим через него (потенциально это намного удобнее, чем страдать с proxy)

> @TODO

# Запуск Cisco (VPN)

Проваливаемся в установленную Ubuntu и запускаем Cisco Anyconnect (откроется GUI форма)

```sh
$ wsl -d Ubuntu /opt/cisco/anyconnect/bin/vpnui
```

> Для удобства запуска можно создать ярлык `"C:\Program Files\WSL\wslg.exe" -d Ubuntu --cd "~" -- /opt/cisco/anyconnect/bin/vpnui`
>
> Или скачать готовый ярлык [Cisco Anyconnect Secure Mobility Client (Ubuntu)](https://github.com/crutch12/sakura/raw/refs/heads/main/Desktop/Cisco%20Anyconnect%20Secure%20Mobility%20Client%20(Ubuntu).lnk)
> 
> (!) **После скачивания надо поменять расширение `.download` -> `.lnk`**

- Сразу жмём на шестерёнку - **Снимаем галки** "Block connections to untrasted servers" и "Minimize AnyConnect on VPN connect", закрываем настройки.
- Указываем (в первый раз) `connect.inno.tech` для подключения
- Вводим креды, подключаемся.
- (!) **Не закрываем/останавливаем терминал**, иначе VPN отключится

# Настройка инструментов

Теперь наш трафик проксируется через wsl виртуальную машину Ubuntu.

Если мы настроили windows proxy, то, например, для Google Chrome прокси уже работает, можно проверить: https://sfera.inno.local

Но многие инструменты (git, npm, ssh, yandex browser, etc.) нужно настраивать вручную

## git

Получилось настроить только проксирование http/https, так что **НЕ ИСПОЛЬЗУЕМ SSH**

### Глобальная настройка под git.sfera.inno.local (рекомендуется)

На host (windows) машине

```sh
$ git config --global http."https://git.sfera.inno.local".proxy "http://inno-proxy:3128"
$ git config --global http."https://git.sfera.inno.local".sslVerify "false"

# для отката
# $ git config --global --unset http."https://git.sfera.inno.local".proxy
# $ git config --global --unset http."https://git.sfera.inno.local".sslVerify
```

Теперь можем клонировать **по https**

### Локальная настройка (не рекомендуется)

Если репа уже склонированна, то можно настроить просто в ней

```sh
$ git config http.proxy "http://inno-proxy:3128"
$ git config http.sslVerify "false"

# для отката
# $ git config --unset http.proxy
# $ git config --unset http.sslVerify
```

## npm

На host (windows) машине

```sh
# указывать глобально для всех пакетов:
$ npm config set proxy http://inno-proxy:3128
# для откака
# $ npm config delete proxy

# или напрямую при командах
$ npm view lodash --proxy http://inno-proxy:3128

# или глобально для нужных реестров пакетов (меняем %REPO_NAME%)
# UPD: Не работает для реестров, хз почему
$ npm config set //sfera.inno.local/app/repo-ci-npm/api/repository/%REPO_NAME%/:proxy=http://inno-proxy:3128
```

# Troubleshooting

### Отключение VPN

1) Нажимаем "Disconnect", ждём
2) Вместо "крестика" отключаем через "Ctrl + C" в терминале Ubuntu

### Иногда wsl нужно полностью перезапускать, т.к. впн ломается

```sh
# выкл
$ wsl -t Ubuntu
# вкл
$ wsl -d Ubuntu

# если предыдущий пример не работает
$ wsl --shutdown
```

### Проверка работы squid proxy (внутри Ubuntu)

```sh
# статус
$ wsl -d Ubuntu sudo systemctl status squid

# логи запросов
$ wsl -d Ubuntu sudo tail +1f /var/log/squid/access.log
```

### Нужного адреса нету в hosts

1) `$ wsl -d Ubuntu dig +short git.sfera.inno.local`
2) Добавляем первый результат в hosts

# Итог и процесс работы

После всех настроек, остаётся только подключать/отключать VPN

### Подключение VPN

```sh
$ wsl -d Ubuntu /opt/cisco/anyconnect/bin/vpnui
```

> Запускать через ярлык удобнее, см. пример сверху

### Отключение VPN

- Кнопка "Disconnect"

### Остановка процесса с VPN (если подключались из терминала)

- "Ctrl + C" в терминале, где подключались

## Запуск Google Chrome в WSL

Очень удобно, когда нам нужно открыть стенд/сферу/swagger/etc., т.к. у стендов много ip и сложно все добавить в hosts

```sh
$ wsl -d Ubuntu google-chrome
```

> Для удобства запуска можно создать ярлык `"C:\Program Files\WSL\wslg.exe" -d Ubuntu --cd "~" -- /usr/bin/google-chrome-stable`
>
> Или скачать готовый ярлык [Google Chrome (Ubuntu)](https://github.com/crutch12/sakura/raw/refs/heads/main/Desktop/Google%20Chrome%20(Ubuntu).lnk)
> 
> (!) **После скачивания надо поменять расширение `.download` -> `.lnk`**

## Отключение/перезапуск NAC Сакура

```sh
# отключить запущенный сервис 
$ wsl -d Ubuntu sudo systemctl stop sakura

# рестарт сервиса
$ wsl -d Ubuntu sudo systemctl restart sakura

# отключить автозапуск сервиса (enable, если нужно вернуть)
$ wsl -d Ubuntu sudo systemctl disable sakura
```

## Работа напрямую из WSL

### Через терминал

Git

```sh
# сначала cd в папку с git репой
$ wsl -d Ubuntu git push
```

Npm
```sh
# сначала cd в папку с git репой
$ wsl -d Ubuntu npm i
$ wsl -d Ubuntu npm run dev
```

### Через VS Code WSL

- https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-wsl

### Через Webstorm

- https://www.jetbrains.com/help/webstorm/how-to-use-wsl-development-environment-in-product.html
- https://stackoverflow-com.translate.goog/questions/51912772/how-to-use-wsl-as-default-terminal-in-webstorm-or-any-other-jetbrains-products?_x_tr_sl=en&_x_tr_tl=ru&_x_tr_hl=ru&_x_tr_pto=sc
