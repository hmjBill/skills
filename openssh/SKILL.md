---
name: openssh
description: OpenSSH 完整用法：作为客户端连接任意服务器（密钥管理、config 别名、跳板机、端口转发、文件传输、连接排障），以及在 Windows/macOS/Linux 上部署加固 sshd 供他人连接
---

# OpenSSH：客户端与服务端

OpenSSH 双向技能，两个方向都覆盖：

- **客户端**（主线）：从本机连到**任意**服务器——自己的 VPS、家里的机器、同事或别人的机器。
  密钥管理、连接别名、跳板机、端口转发、文件传输、连不上时怎么查。
- **服务端**（按需加载）：在**自己的**机器上开 sshd，让别人连进来。安装、加固、权限坑、
  启动失败定位。三平台各自的完整写法在 `references/server-setup.md`，需要时再读。

跨 Windows / macOS / Linux。客户端部分每个操作都给三种平台的写法，或明确说明只在某个平台可用。

**不适用**：GUI 远程桌面（RDP/VNC 的活）；批量管理上百台机器（该用 Ansible）。

## 目录

- [客户端：连接别人的服务器](#客户端连接别人的服务器)
  - [密钥对管理](#密钥对管理) · [ssh config 别名](#ssh-config-别名让连接变简单) · [跳板机](#跳板机proxyjump) · [端口转发](#端口转发) · [文件传输](#文件传输scpsftprsync) · [连接复用](#连接复用-controlmaster)
- [客户端排障](#客户端排障连不上时按这个顺序查)
- [服务端：让别人连你的机器](#服务端让别人连你的机器)
- [平台差异速查](#平台差异速查)
- [已知坑](#已知坑2026-10-实测)

---

# 客户端：连接别人的服务器

## 什么时候用它

- 从本机连到远程机器跑命令、传文件、开隧道。
- 需要固定一套连接参数（跳板机、端口、密钥）不想每次敲一长串。
- 连不上、认证失败、传文件中断，要定位问题。
- 要在自己机器上开 SSH 让别人连（跳到[服务端](#服务端让别人连你的机器)）。

## 前置检查

```bash
# 有没有客户端？Windows 11 / macOS / 现代 Linux 都自带
ssh -V

# 有没有已用的密钥？
ls -la ~/.ssh/
```

Windows 上 `ssh.exe`、`scp.exe`、`sftp.exe` 都在 `C:\Windows\System32\OpenSSH\`，已在 PATH。
macOS / Linux 通常在 `/usr/bin/ssh`。

## 密钥对管理

### 生成

```bash
# ed25519：现在默认选它。短、安全、速度快
ssh-keygen -t ed25519 -C "you@example.com"
```

```powershell
# Windows 同一条命令（PowerShell 里一样用）
ssh-keygen -t ed25519 -C "you@example.com"
```

会问三件事：**存哪**（默认 `~/.ssh/id_ed25519`）、**passphrase**（建议设）、**再确认一次**。
passphrase 是私钥的密码，抵住私钥被盗后直接被用。

| 算法 | 什么时候用 |
| --- | --- |
| `ed25519` | 默认。除非对方是很老的服务器（OpenSSH < 6.5） |
| `rsa -b 4096` | 对方只支持 RSA 时。老设备、少数嵌入式设备、部分云厂商的旧镜像 |
| `ecdsa` | 基本不用，除非明确要求 |

给密钥起名，方便区分不同服务器：

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_github -C "you@github"
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_vps -C "you@vps"
```

### 管理密钥

```bash
# 看指纹，用来和服务器上的公钥核对
ssh-keygen -lf ~/.ssh/id_ed25519.pub

# 改 passphrase
ssh-keygen -p -f ~/.ssh/id_ed25519

# 用 ssh-agent 缓存 passphrase，输一次就够
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
ssh-add -l                      # 看已加载哪些
ssh-add -d ~/.ssh/id_ed25519   # 移除一个
```

Windows 上 `ssh-agent` 是系统服务，用 PowerShell 管理：

```powershell
# agent 服务默认 Automatic；确认在跑
Get-Service ssh-agent | Select-Object Status, StartType

# 加载密钥（和 Linux 同一条命令，只是路径写法不同）
ssh-add "$env:USERPROFILE\.ssh\id_ed25519"
ssh-add -l
```

### 装到远程服务器

`~/.ssh/authorized_keys` 是**服务器端**的文件，用来登记「允许哪些公钥登录这个账号」。

```bash
# Linux / macOS / Git Bash：有 ssh-copy-id，最省事
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server
```

```powershell
# Windows 原生：没有 ssh-copy-id，用管道
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub" |
    ssh user@server "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

```bash
# bash 下的等价写法
cat ~/.ssh/id_ed25519.pub | ssh user@server "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

> `ssh-copy-id` 只存在于 Git Bash / Linux / macOS，**Windows 原生 OpenSSH 不带**。
> 用上面的管道写法，或在 Git Bash 里执行。

`authorized_keys` 的权限必须是 **700（目录）/ 600（文件）**，否则服务器会因为安全拒绝加载：

```bash
# 在远程服务器上执行
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

一次给多台机器装同一个公钥，追加即可（`>>` 不是 `>`，`>` 会覆盖掉原有的）。

### 免 passphrase 登录（服务端允许时）

服务端配置了 `PasswordAuthentication no` 且你的私钥有 passphrase 时，每次连都要输。两个办法：

1. **`ssh-agent`**（推荐）：本机缓存一次，服务端不用改。重启后要重新 `ssh-add`。
2. **服务端配 `ControlMaster`**（见[连接复用](#连接复用-controlmaster)）：只在 macOS / Linux 可用。

`~/.ssh/config` 里没有「跳过 passphrase」的选项，别找了。

## ssh config 别名：让连接变简单

编辑 `~/.ssh/config`（Windows 路径 `C:\Users\<你>\.ssh\config`）。
这是最值得投入的一个配置文件——把所有连接参数固化下来，之后 `ssh myserver` 就够了。

```sshconfig
# ---- 全局默认 ----
Host *
    ServerAliveInterval 60        # 每 60s 发个心跳，防止 NAT 超时断连
    ServerAliveCountMax 3         # 连丢 3 次就放弃
    AddKeysToAgent yes            # 用过的密钥自动加进 agent（OpenSSH 8.2+）

# ---- 普通服务器：最简形式 ----
Host myserver
    HostName 192.168.1.10
    User <用户名>

# ---- 指定密钥和端口 ----
Host vps
    HostName example.com
    User root
    Port 2222
    IdentityFile ~/.ssh/id_ed25519_vps

# ---- 完整写法 ----
Host work
    HostName jump.corp.com
    User deploy
    Port 22
    IdentityFile ~/.ssh/id_ed25519_work
    IdentitiesOnly yes             # 只用这把，别把 agent 里的一起试
    ConnectTimeout 10
    Compression yes

# ---- 强制密码登录（不推荐但有时必需）----
Host legacy
    HostName old.example.com
    PubkeyAuthentication no
    PreferredAuthentications password

# ---- 跳板机 ----
Host inner
    HostName 10.0.0.5
    User deploy
    ProxyJump myserver
```

关键指令：

| 指令 | 作用 |
| --- | --- |
| `HostName` | 真实地址（别名只是本地代号） |
| `User` | 登录用户名，省得每次敲 |
| `Port` | 非 22 端口 |
| `IdentityFile` | 指定用哪把私钥 |
| `IdentitiesOnly yes` | 只试这把密钥。不加的话客户端会把 agent 里**所有**密钥挨个试，慢且可能触发服务端 `MaxAuthTries` |
| `ProxyJump` | 经跳板机连（见下节） |
| `LocalForward` / `RemoteForward` / `DynamicForward` | 端口转发（见下节） |
| `ServerAliveInterval` | 心跳，防 NAT 断连 |

### 查配置解析结果

不确定某台机器最终用了什么参数，直接问 ssh 自己：

```bash
ssh -G myserver | grep -i "hostname\|^user \|port \|identityfile"
```

```powershell
# Windows PowerShell
ssh -G myserver | Select-String "hostname|^user |port |identityfile"
```

`-G` 只打印最终配置、不连接。改完 config 后用它验证，比直接连上去试快得多。

## 跳板机（ProxyJump）

目标在私网、只能从另一台机器进去时用。

```bash
# 临时用一次
ssh -J myserver user@10.0.0.5
```

老版本 ssh（< 7.3）不支持 `-J`，等价写法：

```bash
ssh -o ProxyCommand="ssh -W %h:%p myserver" user@10.0.0.5
```

**多层跳板**（A → B → C）：

```bash
ssh -J user@A,user@B user@C
```

`~/.ssh/config` 里也能串起来：

```sshconfig
Host inner
    HostName 10.0.0.5
    User deploy
    ProxyJump mid

Host mid
    HostName jump2.example.com
    User deploy
    ProxyJump outer

Host outer
    HostName jump1.example.com
    User deploy
```

## 端口转发

### 本地转发（`-L`）

最常用。把本地端口接到远程服务的端口。

```bash
# 把本机 5432 转成能访问远程数据库的通道
ssh -L 5432:db.internal:5432 myserver
# 之后本机客户端连 localhost:5432，实际连的是远程数据库
```

场景：远程有个只监听 `127.0.0.1` 的服务（数据库、管理后台），从外面进不去，用 `-L` 拉出来。

### 远程转发（`-R`）

反过来，把远程端口映射到本地。

```bash
# 在远程机器上开 8080，流量实际转到我本机 3000
ssh -R 8080:localhost:3000 myserver
```

场景：跑临时 demo 给同事看；远程机器不能直接连你本机。

> 服务端 `AllowTcpForwarding no` 会禁用这个（安全加固时经常这么设）。

### 动态转发（`-D`）—— SOCKS 代理

把本机变成 SOCKS 代理，浏览器指向它就能走隧道。

```bash
ssh -N -D 1080 myserver
# 之后把浏览器/应用的 SOCKS 代理设为 127.0.0.1:1080
```

`-N` 表示不开 shell，只做转发，按 `Ctrl+C` 结束。

写进 config 可以省掉每次敲：

```sshconfig
Host proxy
    HostName myserver
    DynamicForward 1080
    LocalForward 5432:db.internal:5432
```

`LocalForward` / `RemoteForward` / `DynamicForward` 在 config 里的写法对应命令行 `-L` / `-R` / `-D`。

> **Windows 原生 ssh.exe 不支持连接复用**（`ControlMaster` 依赖 Unix 域套接字，实测报 `Not a socket`），
> 但 `-L` / `-R` / `-D` 转发本身可用。

## 文件传输：scp / sftp / rsync

### scp

```bash
# 上传文件
scp file.txt user@server:/path/to/

# 下载
scp user@server:/path/remote.txt .

# 目录要加 -r
scp -r ./localdir user@server:/remote/path/

# 用别名（走 ~/.ssh/config）
scp file.txt myserver:/tmp/
scp -P 2222 file.txt user@server:/tmp/     # 注意是大写 P
```

**连老服务器时加 `-O`**：

```bash
scp -O file.txt user@server:/tmp/
```

原因：新版 scp 默认改用 SFTP 协议（走 `sftp` 子系统），老服务器的 sshd 版本低、没启用 SFTP 时会失败。
`-O` 强制走老的 SCP 协议。

### sftp（交互式）

比 scp 稳，能断点、能看目录。

```bash
sftp user@server
```

进去之后：

| 命令 | 作用 |
| --- | --- |
| `lpwd` / `lls` | 本地当前目录 / 列本地目录 |
| `ls` / `cd` | 列远程目录 / 切远程目录 |
| `get <file>` / `put <file>` | 下载 / 上传 |
| `reget <file>` / `reput <file>` | 断点续传下载 / 上传 |
| `bye` | 退出 |

### rsync（只同步差异，最快）

```bash
# 同步目录（-a 保留属性，-v 显示过程，-z 压缩）
rsync -avz ./localdir/ user@server:/remote/dir/

# 试运行，不实际传（-n）
rsync -avzn ./localdir/ user@server:/remote/dir/

# 删除目标端多余文件（--delete 危险，先用 -n 试）
rsync -avz --delete ./localdir/ user@server:/remote/dir/
```

**尾部斜杠的含义很关键**：

```bash
rsync -avz src user@server:/remote/       # 远程出现 /remote/src
rsync -avz src/ user@server:/remote/      # 远程出现 /remote/ 下的内容
```

> **rsync 在 Windows 原生上没有**，需要 WSL。Git Bash 也不自带。macOS 自带（新版已废弃）。

用 ssh 走 rsync 的 host 别名：

```bash
rsync -avz ./dir/ myserver:/remote/dir/
```

## 连接复用（ControlMaster）

反复连同一台机器时，让第一次连接保持后台，后续连接复用它，省掉重复的握手和认证。

```bash
# 第一次（-M 建立主连接，-S 指定套接字路径）
ssh -M -S /tmp/ssh-myserver-%r@%h:%p myserver

# 之后复用
ssh -S /tmp/ssh-myserver-%r@%h:%p myserver
```

写进 config：

```sshconfig
Host myserver
    HostName 192.168.1.10
    User <用户名>
    ControlMaster auto
    ControlPath ~/.ssh/cm/%r@%h:%p
    ControlPersist 10m
```

`ControlPersist 10m` 表示主连接在最后一个会话关闭后还保持 10 分钟。

### 临时关掉服务器主机密钥检查（仅限一次性测试）

```bash
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null user@server
```

**只在临时测试时用。** 生产环境不要——这个选项关掉了 MITM 防护。

`accept-new` 是更安全的折中：自动接受**没见过**的密钥，但见过的密钥变了仍然报错：

```bash
ssh -o StrictHostKeyChecking=accept-new user@server
```

---

# 客户端排障：连不上时按这个顺序查

## 先加 -vvv 看真实过程

```bash
ssh -vvv user@server
```

输出里重点看：

- `Connecting to ... port 22` 之后是 `Connection refused`（端口没服务）、`Operation timed out`（丢包/防火墙）、还是 `No route to host`（路由不通）
- `Authentications that can continue:` 列了哪些方式 → 决定你该用哪种认证
- `Offering public key: ...` 有没有把你的密钥递上去
- `Server accepts key` 之后有没有 `Entering interactive session`

## 对症下药

| 症状 | 原因 | 动作 |
| --- | --- | --- |
| `Connection refused` | 端口没服务，或 sshd 没起 | 换端口试 `ssh -p 2222`；服务端 `systemctl status sshd` |
| `Operation timed out` | 防火墙丢包、路由不通、安全组没放行 | 测 `Test-NetConnection <ip> -Port 22`（Windows）或 `nc -zv <ip> 22`；查云厂商安全组 |
| `Permission denied (publickey)` | 公钥没装、装错位置、或权限太松 | 见下方「公钥认证失败」 |
| `Permission denied (publickey,password)` 且知道密码对 | 客户端只递了密钥没递密码 | 加 `-o PreferredAuthentications=password`，或修好公钥 |
| `Host key verification failed` | 服务器重装过，`known_hosts` 里的旧指纹对不上 | `ssh-keygen -R <host>` 删掉旧记录再连 |
| `REMOTE HOST IDENTIFICATION HAS CHANGED` | 同上，且可能是中间人 | **先确认服务器确实重装过**再用 `-R`，否则可能是攻击 |
| `Too many authentication failures` | agent 里密钥太多，挨个试超过 `MaxAuthTries` | 加 `IdentitiesOnly yes` 并指定 `IdentityFile` |
| `Bad key, bad permissions` | 本机私钥权限过松 | 见下方「私钥权限」 |
| 传大文件中断 | NAT / 防火墙超时 | `ServerAliveInterval 30`，或用 `sftp` 的 `reput` |
| 卡在 `Entering interactive session` 后卡死 | 网络质量差 | `ServerAliveInterval 30` + `ServerAliveCountMax 3` |
| 连上了但没输出、秒退 | 远程 shell 配置有问题（`.bashrc` 里有非交互退出语句） | `ssh -T host` 试非交互模式；查远程 `~/.bashrc` |
| 密码对了但仍被拒 | 远程账号被锁定、密码过期、或不允许密码登录 | 服务端查 `passwd -S <user>`、`sshd -T \| grep -i passwordauth` |

## 私钥权限

Linux / macOS 上权限过松会被拒绝：

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
```

**Windows 上没有这个问题**（用 NTFS ACL，OpenSSH 对 Windows 私钥不做同样的 Unix 权限检查）。

## 公钥认证失败

按顺序确认：

1. **远程 `~/.ssh/authorized_keys` 里确实有你的公钥**——`ssh user@server "cat ~/.ssh/authorized_keys"` 看内容，对比你本地的 `.pub`。
2. **权限对**：`chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys`。
3. **路径对**：`~/.ssh/authorized_keys`（不是 `authorized_keys2`，多数配置已禁用后者）。
4. **没被 `sshd_config` 里的 `AuthorizedKeysFile` 改到别处**：服务端 `sudo sshd -T | grep authorizedkeysfile`。
5. **远程家目录权限过松**：`chmod go-w ~`（有些 sshd 拒绝组或其他人可写的家目录）。
6. **服务端关了公钥认证**：`sudo sshd -T | grep -i pubkeyauth`（应为 `yes`）。

## 快速自检

```bash
# 配置解析：不用连就能看最终参数
ssh -G myserver | grep -i "hostname\|^user \|port \|identityfile"

# 网络 + 认证过程：只看最后 20 行
ssh -vv -o ConnectTimeout=5 user@server exit 2>&1 | tail -20
```

---

# 服务端：让别人连你的机器

要在自己机器上开 sshd，让别人（或自己的另一台设备）连进来。

**完整的三平台写法在 `references/server-setup.md`**（约 470 行），需要时再读。本文只留最常用的骨架和判断要点。

所有命令都需要管理员 / root 权限。

## 三平台一句话

```powershell
# Windows：服务端装成系统能力，落点 C:\Windows\System32\OpenSSH\
Add-WindowsCapability -Online -Name 'OpenSSH.Server~~~~0.0.1.0'
& "$env:WINDIR\System32\OpenSSH\ssh-keygen.exe" -A     # 生成主机密钥
Start-Service sshd
```

```bash
# Linux：系统自带 openssh-server
sudo apt install openssh-server      # 或 dnf install openssh-server
sudo systemctl enable --now sshd
```

```bash
# macOS：系统自带，开远程登录
sudo systemsetup -setremotelogin on
```

配置文件：Windows `C:\ProgramData\ssh\sshd_config`，macOS/Linux `/etc/ssh/sshd_config`。
改完都要重启服务才生效。

## 加固的三条底线

1. **`PasswordAuthentication no`**——密码在任何可达网络上都能被暴力尝试，这是最大的单点风险。
2. **`AllowUsers <你的用户名>`**——不写的话任何本地账户都能登录。
3. **防火墙按网段放行**，不要留 `remote=Any`。装完自带的规则通常就是 `Any`，**必须改**。

常用收紧项（完整清单见 references）：`MaxAuthTries 3`、`LoginGraceTime 30`、
关掉 `AllowTcpForwarding` / `X11Forwarding` / `PermitTunnel`。

> ⚠️ `AllowTcpForwarding no` 会同时断掉客户端的 `-L`/`-R`。需要转发就别关，
> 或用 `AllowTcpForwarding local` / `remote` 精确放行一侧。

## 两个平台特有的坑

**Windows 管理员读的是共享公钥文件**，不是各自的用户目录。公钥放进 `~/.ssh/authorized_keys` 不生效，
要放 `C:\ProgramData\ssh\administrators_authorized_keys`。

**Windows 主机密钥 ACL 是本技能最难的部分**：StrictModes 同时查属主和 DACL，
且 **SYSTEM 与 Administrators 必须同时有完全控制**（多一条少一条都报 `too open`）。
完整配方、SDDL 判读方法、`icacls` 的两个陷阱，都在 `references/server-setup.md` 的
「Windows 主机密钥 ACL」一节。

**Linux 常见**：`Missing privilege separation directory` → `sudo mkdir -p /run/sshd`。

## 手动 vs 自启

| 用法 | 设置 | 说明 |
| --- | --- | --- |
| 坐在电脑前才用 | `Manual` / `systemctl disable` | 不用时端口不监听，零攻击面 |
| 想在外面直接 SSH 进来 | `Automatic` / `systemctl enable` | 开机就在；先鸡后蛋问题不存在了 |

> **「手动」的陷阱**：服务没开时你**没法从外面 SSH 进来把它开起来**。需要随时能连就设自启。

## 验证：必须真连一次

服务显示 Running **不能**证明能用。跑两条：

```bash
# 1. 公钥能登录，期望 exit=0 且打印 SSH_LOGIN_OK
ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes -o ConnectTimeout=10 \
    '<用户名>@127.0.0.1' 'whoami && echo SSH_LOGIN_OK'

# 2. 密码认证必须被拒，期望 exit=255 且 Permission denied
ssh -o BatchMode=yes -o PreferredAuthentications=password -o PubkeyAuthentication=no \
    -o ConnectTimeout=10 '<用户名>@127.0.0.1' 'echo SHOULD_NOT_WORK'
```

再**用真实网段 IP** 连一次——loopback 绕过防火墙，测不出放行范围。

Windows 完整写法、Linux/macOS 写法、以及三个注意点（`-i` 路径格式、远程命令用 `&&`、
loopback 测不到防火墙），见 `references/server-setup.md` 的「验证：必须真连一次」一节。

**起不来时怎么定位**（抓 stderr、对照实验、排除干扰项三步法）见 `references/server-setup.md`
的「服务起不来时怎么定位」一节。核心是：事件日志通常只有「服务意外终止」，
**必须用计划任务以 SYSTEM 身份手动跑 sshd 才能抓到真实报错**。
---

# 平台差异速查

| 项 | Windows | macOS | Linux |
| --- | --- | --- | --- |
| 客户端路径 | `C:\Windows\System32\OpenSSH\` | `/usr/bin/ssh` | `/usr/bin/ssh` |
| `ssh-copy-id` | 原生没有（Git Bash 有） | 有 | 有 |
| `rsync` | 需 WSL | 自带（新版已废弃） | 自带 |
| 连接复用 `ControlMaster` | 不支持（报 `Not a socket`） | 支持 | 支持 |
| 私钥权限检查 | 无（用 NTFS ACL） | 有 | 有 |
| 服务端配置 | `C:\ProgramData\ssh\sshd_config` | `/etc/ssh/sshd_config` | `/etc/ssh/sshd_config` |
| 主机密钥权限要求 | ACL 属主 + DACL | `600` + 属主 root | `600` + 属主 root |
| 管理员公钥路径 | `C:\ProgramData\ssh\administrators_authorized_keys` | 无此概念 | 无此概念 |
| 启服务 | `Start-Service sshd` | `systemsetup -setremotelogin on` | `systemctl start sshd` |
| sftp 子系统 | `sftp-server.exe` | `sftp-server` | `sftp-server` |
| 防火墙 | `New-NetFirewallRule` | `socketfilterfw` | `ufw` / `firewalld` |
| `known_hosts` | `%USERPROFILE%\.ssh\known_hosts` | `~/.ssh/known_hosts` | `~/.ssh/known_hosts` |

**跨平台连接服务端是 Windows 时的额外一关**：管理员账号要读共享公钥文件（见上文）。
这是 Windows 独有的，macOS / Linux 不需要操心。

---

# 已知坑（2026.10 实测）

## 通用

1. **`Too many authentication failures` 是 agent 里密钥太多**，不是服务端拒绝。
   客户端把 agent 里所有密钥挨个试，超过服务端 `MaxAuthTries`（默认 6）就断开。
   加 `IdentitiesOnly yes` + `IdentityFile` 精确指定。
2. **`ssh -G host` 是验证 config 的最快方式**，改完不用真连就能确认解析结果。
3. **`Host key verification failed` 不要无脑 `-R`**。先确认服务器是不是重装过；
   指纹不一致也可能是中间人攻击。无条件删掉等于放弃了 MITM 防护。
4. **远程 `~/.bashrc` 里写了对非交互 shell 不友好的逻辑**（无条件 `exit`、交互式提示等），
   会导致「连上了但立刻断开、没输出」。用 `ssh -T host` 区分是连接问题还是 shell 问题。
5. **远程命令用 `&&` 不要用 `;`**。Windows 的 cmd 会把 `;` 当成 `whoami /;` 的参数。

## Windows 特有

6. **StrictModes 查属主 + DACL 两者，且 SYSTEM 与 Administrators 必须同时有完全控制。**
   「收紧到只有 SYSTEM」是错的，会触发 `too open` / `bad permissions`。用 .NET 的
   `SetOwner` + `SetAccessRuleProtection` + 逐条 `AddAccessRule` 一次建好。
7. **`icacls /reset` 接 `/inheritance:r` 会产生空 DACL**（SDDL 变成 `D:PAI`），
   连提权管理员都读不到，而且此时 `icacls` 自己都改不动（报「拒绝访问」）。
   看到 `sshd_config: Permission denied` 且你确实是管理员，先查 SDDL。
8. **`icacls /grant:r` 是替换不是追加**，一次写两条 ACE 时后一条会顶掉前一条。
   要两条都在就用 .NET API，或分两次 `/grant`。
9. **sshd 运行时会锁住 `sshd_config`**，此时 `WriteAllText` 不报错但内容写不进去
   （读回来还是旧内容，或字节数对不上）。改配置前先 `Stop-Service sshd`。
10. **Windows 原生 ssh 不支持 `ssh-copy-id`、不支持 `rsync`、不支持连接复用。**
    前两个用 Git Bash / WSL 绕，连接复用无解（用别的方式减少重复连接）。
11. **`lookup_sid() failed: 1332` 是噪音**，与启动失败无关（实测删掉全部 ProfileList 孤儿 SID 后照样报）。
12. **`.ps1` 里混进 bash 语法会静默失败**。写 `<<<` 这类重定向符，PowerShell 解析失败且不生成日志文件，
    表现为「脚本什么都没做」。日志文件没生成 = 解析错误，不是运行时错误。
    另外 `.ps1` 里不要写中文字面量：Windows PowerShell 5.1 按 ANSI 读无 BOM 的 UTF-8，会整份解析失败。
13. **`Start-Process -Verb RunAs` + `-RedirectStandardError` 抓不到服务进程的输出**，
    因为 SCM 启动的进程不继承重定向句柄。绕法是计划任务 + cmd 包装。
14. **别把「进程没出现」当成「sshd 崩了」**。观察整个启动过程若一次都没见到 `sshd.exe`，
    说明它在创建时就失败了，此时报错信息只能靠计划任务复现。
15. **做对照实验后恢复文件要核对字节数**。恢复错了不会报错，只是配置悄悄变回默认——
    用字节数 / `Get-Content` 双重确认，别信「restore 完成」的日志。
16. **Windows 默认配置里 `PasswordAuthentication` 是被注释的，即「启用」。**
    `#PasswordAuthentication yes` 里的注释不是关闭，删掉注释项前要确认当前实际值。

## 服务端安全

17. **关密码登录前先确认公钥真能登进去**，否则会把自己锁在门外。
    顺序是：先配好公钥 → 实测连上 → 再关密码。
18. **`AllowTcpForwarding no` 会同时断掉客户端的 `-L`/`-R`**。需要转发就别关，
    或用 `AllowTcpForwarding local` / `remote` 精确放行一侧。
19. **StrictModes 卡住时不要退而改用 `StrictModes no`**——那等于放弃主机密钥保护，是真实的安全降级。
20. **主机密钥不要重新生成**，除非确实要轮换。客户端 `known_hosts` 里存的是指纹，
    重新生成会让所有客户端报主机密钥变更。
21. **私钥等同于账号凭据**，不要贴进对话、提交进仓库或放进云同步目录。
22. **服务端跑在公网上时，`AllowUsers` 白名单比关密码更重要**——它挡住了所有非白名单账户，
    包括那些密码恰好被猜中的。
