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

На более старых версиях сборках: https://learn.microsoft.com/ru-ru/windows/wsl/install-manual)

## Установка wsl Ubuntu (если не установлена)

```sh
# полный список образов
$ wsl -l -o

# ставим "Ubuntu". Или если хотите поставить другую версию, то можно, например Ubuntu-20.04
$ wsl --install Ubuntu
# во время установки указываем логин/пароль (root/password)
```

## Настройка Ubuntu

Проваливаемся в установленную Ubuntu и устанавливаем все нужные пакеты (Sakura, Cisco)

```sh
$ wsl -d Ubuntu sudo su -c "bash <(wget -qO- https://raw.githubusercontent.com/crutch12/sakura/refs/heads/main/setup.sh)" root
```

> Не останавливаем до сообщения "Sakura, Squid and Cisco Anyconnect setup complete!!!"

> Через 30-60 секунд можно проверить, что sakura работает: http://localhost:4567/test

# Настройка proxy (с хоста)

## DNS (hosts файл)

Меняем файл (открываем от админа) C:\Windows\System32\drivers\etc\hosts
```
10.169.6.196 sfera.inno.local
10.169.7.247 git.sfera.inno.local
10.169.7.215 repo-ci.sfera.inno.local
10.169.7.215 npm.repo-ci.sfera.inno.local
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

> (!) Для удобства, сразу делаем для этого адреса domain имя (через hosts файл)
```
# hosts файл
172.25.203.50 inno-proxy
```
**Теперь можно везде указывать `inno-proxy:3128`**

> При перезапуске есть шанс, что адрес поменяется. Тут есть инструкция по автонастройке ip для wsl машины
> https://gist.github.com/wllmsash/1636b86eed45e4024fb9b7ecd25378ce

### Как использовать прокси

1) Самый простой вариант (хотя бы проверить, что работает)

Windows - Network & internet > Proxy > Manual proxy setup

Указываем `inno-proxy:3128`

2) Или через .pac файл

Windows - Network & internet > Proxy > Use setup script > Указываем URL до .pac файла (например `https://raw.githubusercontent.com/crutch12/sakura/refs/heads/main/proxy.pac`)

Пример PAC файла для настройки proxy (с.м. https://learn.microsoft.com/en-us/previous-versions/troubleshoot/browsers/connectivity-navigation/optimize-pac-performance)

```js
function FindProxyForURL(url, host) {
  if (shExpMatch(host, "sfera.inno.local") || shExpMatch(host, "*.sfera.inno.local")) {
    // Use the WSL proxy (replace WSL_IP and port with your WSL IP and proxy port)
    return "PROXY inno-proxy:3128"; // WSL IP and Squid port
  }

  return "DIRECT";
}
```

> (!) .pac файл должен быть доступен по http, например https://raw.githubusercontent.com/crutch12/sakura/refs/heads/main/proxy.pac

# Запуск Cisco (VPN)

Проваливаемся в установленную Ubuntu и запускаем Cisco Anyconnect (откроется GUI форма)

```sh
$ wsl -d Ubuntu sudo /opt/cisco/anyconnect/bin/vpnui
```

- Сразу жмём на шестерёнку - **Снимаем галки** "Block connections to untrasted servers" и "Minimize AnyConnect on VPN connect", закрываем настройки.
- Указываем (в первый раз) `connect.inno.tech` для подключения
- Вводим креды, подключаемся.
- (!) **Не закрываем/останавливаем терминал**, иначе vpn отключится

# Настройка инструментов

Теперь наш трафик проксируется через wsl виртуальную машину Ubuntu.

Если мы настроили windows proxy, то, например, для Google Chrome прокси уже работает, можно проверить: https://sfera.inno.local

Но многие инструменты (git, npm, ssh, yandex browser, etc.) нужно настраивать вручную

## git

**Получилось настроить только проксирование http/https, так что НЕ используем ssh**

### Глобальная настройка под git.sfera.inno.local (рекомендуется)

В `~/.gitconfig` добавляем (на host машине!)

```
[http]
[http "https://git.sfera.inno.local"]
	proxy = http://inno-proxy:3128
	sslVerify = false
```

Теперь можем клонировать **по https**

### Локальная настройка, если репа уже склонированна, то можно настроить просто в ней (не рекомендуется)

```sh
$ git config http.proxy "http://inno-proxy:3128"
$ git config http.sslVerify "false"
```

## npm

```sh
# глобально для нужных реестров пакетов (меняем %REPO_NAME%)
# UPD: Не работает для реестров, хз почему
$ npm config set //sfera.inno.local/app/repo-ci-npm/api/repository/%REPO_NAME%/:proxy=http://inno-proxy:3128

# или указывать глобально для всех пакетов:
$ npm config set proxy http://inno-proxy:3128

# или напрямую при командах
$ npm view lodash --proxy http://inno-proxy:3128
```

# Troubleshooting

- Отключение VPN

1) Нажимаем "Disconnect", ждём
2) Вместо "крестика" отключаем через "Ctrl + C" в терминале Ubuntu

- Иногда wsl нужно полностью перезапускать, т.к. впн ломается

```sh
# выкл
$ wsl -t Ubuntu
# вкл
$ wsl -d Ubuntu

# если предыдущий пример не работает
$ wsl --shutdown
```

- Проверка работы squid proxy (внутри Ubuntu)

```sh
# статус
$ wsl -d Ubuntu sudo systemctl status squid

# логи запросов
$ wsl -d Ubuntu sudo tail +1f /var/log/squid/access.log
```

# Итог

После всех настроек, остаётся только подключать/отключать vpn

- Подключение VPN
```sh
$ wsl -d Ubuntu sudo /opt/cisco/anyconnect/bin/vpnui
```

- Отключение VPN

Кнопка "Disconnect"

- Выключение VPN

"Ctrl + C" в терминале, где подключались

## Отключение/перезапуск NAC Сакура

```sh
# отключить запущенный сервис 
$ wsl -d Ubuntu sudo systemctl stop sakura

# рестарт сервиса
$ wsl -d Ubuntu sudo systemctl restart sakura

# отключить автозапуск сервиса (enable, если нужно вернуть)
$ wsl -d Ubuntu sudo systemctl disable sakura
```