Windows: WSL (Ubuntu) + Sakura + Cisco Anyconnect

> [!NOTE]
> Работает на версиях Ubuntu
> - ubuntu:20.04
> - ubuntu:22.04

> [!CAUTION]
> Не работает на версиях Ubuntu
> - ubuntu:24.04 (из-за библиотеки `libwebkit2gtk-4.0-37`)

# Проблема и решение

### Проблема

- для работы с inno.local нужно поставить NAC Сакура (которая имеет много доступа к системе)

### Решение

- поднимаем WSL (linux внутри windows), туда устанавливаем NAC Сакура и Cisco Anyconnect
  - (дополнительно) настраиваем проксирование трафика с host (windows) машины через WSL

# WSL

Все команды выполняются от админа (наверное)

## Установка WSL (если не установлен)

> [!IMPORTANT]
> **Обязательно используем WSL версии 2!**

Для windows 10/11 сборка 19041 и выше

```sh
$ wsl --set-default-version 2
$ wsl --update
```

На более старых windows сборках: https://learn.microsoft.com/ru-ru/windows/wsl/install-manual

## Настройка WSL (крайне рекомендуется)

1. Открываем файл `%USERPROFILE%\.wslconfig` (`C:\Users\<UserName>\.wslconfig`)

2. Заменяем содержимое, сохраняем:
```ini
[wsl2]
memory=8GB   # Limits VM memory in WSL
processors=4 # Makes the WSL 2 VM use two virtual processors
nestedVirtualization=true # Меняем на false в случае ошибки "Nested virtualization is not supported on this machine"

[network]
generateResolvConf=false # fixes /etc/resolve.conf file

[system-distro-env]
WESTON_RDP_MONITOR_REFRESH_RATE=60 # changes FPS (https://github.com/microsoft/wslg/wiki/Controlling-WSLg-frame-rate)
```

3. Применяем настройки `wsl`

```sh
$ wsl --shutdown
```

## Установка Ubuntu (если не установлена)

```sh
# полный список образов
$ wsl -l -o

# ставим "Ubuntu-20.04" (или Ubuntu-22.04)
$ wsl --install Ubuntu-20.04

# во время установки указываем логин/пароль (например user/password)

# (опционально) меняем дефолтную версию версию wsl дистрибутива
# чтобы все последующие команды можно было вызывать без -d Ubuntu-20.04
$ wsl --set-default Ubuntu-20.04
```

> [!NOTE]
> Если вы **не настроили `wsl --set-default`** (если не хотите менять дефолтный дистрибутив), то все последующие wsl команды должны начинаться так:
> ```sh
> $ wsl -d Ubuntu-20.04
> ```

## Настройка Ubuntu (установка Sakura, Cisco Anyconnect и т.д.)

> [!IMPORTANT]
> **Убедитесь, что все VPN (в т.ч. VPN/proxy расширения в браузере) отключены**

Проваливаемся в установленную Ubuntu и устанавливаем все нужные пакеты (Sakura, Cisco, Google Chrome)

```sh
$ wsl sudo su -c "bash <(wget --no-cache -qO- https://raw.githubusercontent.com/crutch12/sakura/refs/heads/main/setup.sh)" root
```

> [!NOTE]
> - Не останавливаем до сообщения **"Sakura, Squid and Cisco Anyconnect setup complete!!!"**
> - Через 30-60 секунд можно проверить, что Sakura работает: http://localhost:4567/test

> [!WARNING]
> **Если после старта команды ничего не происходит, то, скорее всего, дело в настройках DNS. Тогда сначала запускаем команду и пробуем ещё раз**
> ```sh
> $ wsl sudo su -c "echo 'nameserver 8.8.8.8' > /etc/resolv.conf" root
> ```

> [!WARNING]
> **Если виснет на установке пакетов, то попробуйте включить зарубежный VPN, возможно проблема в недоступности домена `achrive.ubuntu.com`**

> [!WARNING]
> Если ничего не помогло
> - перезапустите ПК
> - перепроверьте, что все VPN выключены

# Запуск Cisco Anyconnect (VPN)

Проваливаемся в установленную Ubuntu и запускаем Cisco Anyconnect (откроется GUI форма)

```sh
$ wsl sudo /opt/cisco/anyconnect/bin/vpnui
```

- Открываем настройки (жмём на шестерёнку)
  - отключаем **Block connections to untrasted servers**
  - отключаем **Minimize AnyConnect on VPN connect**
  - закрываем настройки
- Указываем `connect.inno.tech` для подключения
- Вводим логин/пароль, подключаемся
  - **Не закрываем/останавливаем терминал**, иначе VPN отключится

> [!TIP]
> После первого запуска приложения, Windows автоматически создаст ярлык `Cisco Anyconnect Secure Mobility Client (Ubuntu)` (ищите в "Пуск").
>
> **Последующие разы можно запускать через ярлык.**

Теперь можем проверить, что VPN работает (пункт [Запуск Google Chrome в WSL](#запуск-google-chrome-в-wsl))

## Запуск Google Chrome в WSL

Очень удобно, когда нам нужно открыть стенд/сферу/swagger/etc., т.к. у стендов много ip и сложно все добавить в hosts

```sh
$ wsl google-chrome
```

В открывшимся Google Chrome окне открываем ссылку https://sfera.inno.local

**Открылось? Работает! 🎉**

> [!TIP]
> После первого запуска приложения, Windows автоматически создаст ярлык `Google Chrome (Ubuntu)` (ищите в "Пуск").
>
> **Последующие разы можно запускать через ярлык.**

# Настройка proxy (с хоста)

> [!NOTE]
> Этот этап можно полностью пропустить в случаях:
> 
> - если вам для работы достаточно браузера (Google Chrome через WSL, пример запуска браузера в пункте [Запуск Google Chrome в WSL](#запуск-google-chrome-в-wsl))
> - или если вы будете работать исключительно через WSL (пример в пункте [Работа с проектом напрямую из WSL](#работа-с-проектом-напрямую-из-wsl))
> 
> В таком случае переходим к пункту [Итог и процесс работы](#итог-и-процесс-работы)

## DNS (hosts файл)

> [!CAUTION]
> - все команды выполняем с включённым Cisco Anyconnect
> - если в будущем у используемых хостов (например sfera.inno.local) поменяется ip адрес, то нужно повторить этот пункт
> - **так же этот пункт нужно повторять после Отключения Check Point Mobile, т.к. он затирает hosts файл**

### Шаг 1. Генерируем содержимое hosts файла

- Выполняем команды

```sh
# сначала качаем список известных доменов (дальше его можно отредактировать руками)
$ wsl wget --no-cache https://github.com/crutch12/sakura/raw/refs/heads/main/inno_hostnames.txt -O ~/inno_hostnames.txt

# теперь качаем скрипт
$ wsl wget --no-cache https://github.com/crutch12/sakura/raw/refs/heads/main/hosts.js -O ~/hosts.js

# теперь выполняем скрипт. В ответ получим содержимое для hosts файла
$ wsl node ~/hosts.js
```

- Копируем результат вывода второй команды

> [!NOTE]
> Если ваш список доменов отличается, то перед запуском скрипта его можно обновить вручную
>
> ```sh
> # редактируем (и сохраняем) inno_hostnames.txt список
> $ wsl nano ~/inno_hostnames.txt
> 
> # ещё раз запускаем скрипт и копируем результат
> $ wsl node ~/hosts.js
> ```

> [!TIP]
> Если запускать скрипт `~/hosts.js` с флагом `--save`, то скрипт автоматически применит значения в `C:\Windows\System32\drivers\etc\hosts` файл.
>
> ```sh
> # (!) работает только от админа (!)
> 
> # автоматически обновить файл hosts
> $ wsl node ~/hosts.js --save
> ```
>
> **Теперь Шаг 2. можно пропустить.**

### Шаг 2. Меняем файл hosts (открываем от админа)

- Открываем файл `C:\Windows\System32\drivers\etc\hosts`
- Вставляем результат вывода с предыдущего шага

Пример

```
172.25.203.50 inno-proxy
10.169.6.196 sfera.inno.local
10.169.7.247 git.sfera.inno.local
10.169.7.215 repo-ci.sfera.inno.local npm.repo-ci.sfera.inno.local docker.repo-ci.sfera.inno.local maven.repo-ci.sfera.inno.local
10.234.156.160 curs-root-ui.dev.curs.apps.innodev.local
10.234.156.159 api-gw.dev.curs.apps.innodev.local
```

### Настройка неизвестных адресов (вручную)

Если по мере работы с сервисами встретили неизвестный домен, то можно получить его ip вручную. Пример:

```sh
$ wsl dig +short git.sfera.inno.local
```

Дальше просто добавляем ip + адрес в `hosts` файл.

> [!WARNING]
> Вместо ручного добавления новых ip рекомендуется получать список `hosts` через редактирование `inno_hostnames.txt` файла и перезапуск `hosts.js` скрипта (см. замечание в  [Шаг 1.](#шаг-1-генерируем-содержимое-hosts-файла))

## Proxy

### Шаг 1. Получаем ip адрес proxy сервера

> [!TIP]
> **Если на предыдущем этапе в hosts файл уже указали `inno-proxy` хост, то переходим сразу к Шаг 2.**

<details>
  <summary>Ручная настройка hosts</summary>

  ```sh
  # через wsl вызов (берём ip, который слева)
  $ wsl hostname -I

  # или через wsl дистрибутив
  $ wsl
  $ ip addr show eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}'

  # или через wsl дистрибутив в одну команду, но без grep
  $ wsl ip addr show eth0
  ```

  Полученный адрес (например `172.25.203.50`) добавляем в hosts (`C:\Windows\System32\drivers\etc\hosts`) файл

  ```
  # hosts файл
  172.25.203.50 inno-proxy
  ```

  Теперь во всех местах в качестве proxy сервера мы будем указывать `inno-proxy:3128`

  > При перезапуске есть шанс, что адрес поменяется. Тут есть инструкция по автонастройке ip для wsl дистрибутива
  > https://gist.github.com/wllmsash/1636b86eed45e4024fb9b7ecd25378ce
</details>

### Шаг 2. Включаем proxy (windows)

#### Вариант 1. Через .pac файл

- Windows - Network & internet > Proxy > Use setup script
- Указываем `https://raw.githubusercontent.com/crutch12/sakura/refs/heads/main/proxy.pac`

<details>
  <summary>Про .pac файлы</summary>

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
</details>

#### Вариант 2. Вручную для всех доменов

- Windows - Network & internet > Proxy > Manual proxy setup
- Указываем `inno-proxy:3128`

#### Вариант 3. VPN вместо proxy

Настраиваем VPN на wsl дистрибутиве (например wireguard) и ходим через него (потенциально это намного удобнее, чем страдать с proxy)

> @TODO

### Шаг 3. Проверяем proxy (windows)

Теперь наш трафик частично проксируется через wsl дистрибутив Ubuntu. Проверяем:

- Открываем обычный Google Chrome/Firefox
- Открываем https://sfera.inno.local
- **Открылось? Proxy работает! 🎉**

# Настройка инструментов для работы с proxy (proxy agent)

Многие инструменты (git, npm, node, ssh, yandex browser, maven, etc.) нужно дополнительно настраивать вручную, т.к. они не используют системный proxy по умолчанию.

## git

Получилось настроить только проксирование http/https, так что **НЕ ИСПОЛЬЗУЕМ SSH**

### Глобальная настройка (рекомендуется)

На host (windows) машине

```sh
$ git config --global http."https://git.sfera.inno.local".proxy "http://inno-proxy:3128"
$ git config --global http."https://git.sfera.inno.local".sslVerify "false"

# для отката
# $ git config --global --unset http."https://git.sfera.inno.local".proxy
# $ git config --global --unset http."https://git.sfera.inno.local".sslVerify
```

Теперь репозитории можно клонировать/пушить/пуллить, **но только по https!!!**

<details>
  <summary>Проблемы с UI клиентами (Unable to access https://git.sfera.inno.local)</summary>

  > Fork и SmartGit по умолчанию используют встроенные `git.exe` клиенты (вместо установленных в системе), из-за этого они могут игнорировать глобальные настройки.
  > 
  > **Решение**: в настройках UI клиента поменять "встроенный" клиент на "системный" (обычно это `C:\Program Files\Git\bin\git.exe` или `C:\Program Files\Git\cmd\git.exe`)
</details>

### Локальная настройка (не рекомендуется)

Если репа уже склонированна, то можно настроить git внутри репозитория:

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

# или через .npmrc файл (в проекте)
# # ./npmrc
# proxy=http://inno-proxy:3128

# или глобально для нужных реестров пакетов (меняем %REPO_NAME%)
# UPD: Не работает, хз почему
$ npm config set //sfera.inno.local/app/repo-ci-npm/api/repository/%REPO_NAME%/:proxy=http://inno-proxy:3128
```

> [!WARNING]
> В некоторых обстоятельствах опция `npm config proxy` автоматически влияет на работу `node.js`. Например:
> 
> - `Axios` по умолчанию обрабатывает переменную среды `npm_config_proxy`. Поэтому запросы через `squid` фейлятся (**причём только на `axios >= 1`**)
>   - Пруфы:
>     - настройка proxy: https://github.com/axios/axios/blob/82f94556e5301d6ce3ef8006fbf6892dc1141bd1/lib/adapters/http.js#L85
>     - обработка переменной среды: https://github.com/Rob--W/proxy-from-env/blob/095d1c26902f37a12e22bea1b8c6b67bf13fe8cd/index.js#L45
>   - Лечение (если фейлится):
>     - использовать `https-proxy-agent`: https://github.com/axios/axios/issues/2072#issuecomment-567473812
>     - или отключить прокси: указывать `{ proxy: false }`
> 
> Если эту проблему не удаётся решить, то рекомендуется **отключать настройку `npm config proxy`** при работе с `node.js` проектом.

## node.js

Используем пакет [global-agent](https://www.npmjs.com/package/global-agent)

Устанавливаем

```sh
$ npm i -D global-agent
```

Подключаем

```js
// задаём переменную среды для настройки глобального proxy (например в .env файле)
// GLOBAL_AGENT_HTTP_PROXY=http://inno-proxy:3128

// @NOTE: Настройка proxy для dev режима (если проксируем трафик до inno сети)
if (process.env.GLOBAL_AGENT_HTTP_PROXY) {
  require('global-agent').bootstrap();
}
```

## maven

На host (windows) машине в `%USERPROFILE%\.m2\settings.xml` (`C:\Users\<UserName>\.m2\settings.xml`) добавить:

```xml
<settings>
  .
  .
  <proxies>
   <proxy>
      <host>inno-proxy</host>
      <port>3128</port>
    </proxy>
  </proxies>
  .
  .
</settings>

```

# Troubleshooting

### Иногда wsl нужно полностью перезапускать, т.к. впн ломается

```sh
# выкл
$ wsl -t Ubuntu-20.04
# вкл
$ wsl -d Ubuntu-20.04

# если предыдущий пример не работает
$ wsl --shutdown
```

### Иногда впн ломает DNS и wsl дистрибутив вообще не может подключиться никуда (в т.ч. к впн)

Сбрасываем `/etc/resolv.conf`

```sh
$ wsl sudo su -c "echo 'nameserver 8.8.8.8' > /etc/resolv.conf" root
```

### Проверка работы squid proxy (внутри Ubuntu)

```sh
# статус
$ wsl sudo systemctl status squid

# логи запросов
$ wsl sudo tail +1f /var/log/squid/access.log
```

### Если нужного адреса нету в hosts

1) `$ wsl dig +short git.sfera.inno.local`
2) Добавляем первый результат в hosts

### Если на диске C: не хватает места под машины wsl

Переносим хранение дистрибутивов wsl на диск D:

- https://github.com/pxlrbt/move-wsl
  - Важное замечание при копировании Docker виртуалки: https://github.com/pxlrbt/move-wsl/issues/14#issuecomment-1246050916

# Итог и процесс работы

После всех настроек, остаётся только подключать/отключать VPN

## Cisco Annyconnect

### Подключение VPN

Через ярлык `Cisco Anyconnect Secure Mobility Client (Ubuntu)` (см. пункт [Запуск Cisco Anyconnect (VPN)](#запуск-cisco-anyconnect-vpn))

```
*Клик-клик*
```

Или через терминал

```sh
$ wsl sudo /opt/cisco/anyconnect/bin/vpnui
```

### Отключение VPN

- Кнопка "Disconnect"

### Остановка процесса с VPN (если подключались из терминала)

- "Ctrl + C" в терминале, где подключались

## Google Chrome (WSL)

См. пункт [Запуск Google Chrome в WSL](#запуск-google-chrome-в-wsl)

## NAC Сакура

### Отключение/перезапуск NAC Сакура

```sh
# отключить запущенный сервис 
$ wsl sudo systemctl stop sakura

# рестарт сервиса
$ wsl sudo systemctl restart sakura

# отключить автозапуск сервиса (enable, если нужно вернуть)
$ wsl sudo systemctl disable sakura
```

## Работа с проектом напрямую из WSL

> [!NOTE]
> Если не нужен/не работает proxy

### Через терминал

Git

```sh
# сначала cd в папку с git репой
$ wsl git push
```

Npm

```sh
# сначала cd в папку с git репой
$ wsl npm i
$ wsl npm run dev
```

### Через VS Code WSL

- https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-wsl

### Через Webstorm

- https://www.jetbrains.com/help/webstorm/how-to-use-wsl-development-environment-in-product.html
- https://stackoverflow-com.translate.goog/questions/51912772/how-to-use-wsl-as-default-terminal-in-webstorm-or-any-other-jetbrains-products?_x_tr_sl=en&_x_tr_tl=ru&_x_tr_hl=ru&_x_tr_pto=sc
