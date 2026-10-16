---
name: ssh
description: SSH 客户端与服务端完整用法：作为客户端连接任意服务器（密钥管理、config 别名、跳板机、端口转发、文件传输、连接排障），以及在 Windows/macOS/Linux 上部署加固 sshd 供他人连接
---

# SSH：客户端与服务端

SSH 双向技能，两个方向都覆盖：

- **客户端**（主线）：从本机连到**任意**服务器——自己的 VPS、家里的机器、同事或别人的机器。
  密钥管理、连接别名、跳板机、端口转发、文件传输、连不上时怎么查。
- **服务端**（附篇）：在**自己的**机器上开 sshd，让别人连进来。安装、加固、权限坑、启动失败定位。

跨 Windows / macOS / Linux。每个操作都给三种平台的写法，或明确说明只在某个平台可用。

**不适用**：GUI 远程桌面（RDP/VNC 的活）；批量管理上百台机器（该用 Ansible）。

## 目录

- [客户端：连接别人的服务器](#客户端连接别人的服务器)
  - [密钥对管理](#密钥对管理) · [ssh config 别名](#ssh-config-别名让连接变简单) · [跳板机](#跳板机proxyjump) · [端口转发](#端口转发) · [文件传输](#文件传输scpsftprsync) · [连接复用](#连接复用-controlmaster)
- [客户端排障](#客户端排障连不上时按这个顺序查)
- [服务端：让别人连你的机器](#服务端让别人连你的机器)
  - [安装](#安装) · [sshd_config 加固](#sshd_config-加固) · [公钥认证](#公钥认证) · [防火墙](#防火墙放行范围) · [服务管理](#服务管理) · [服务起不来](#服务起不来时怎么定位)
- [服务端排障](#服务端排障)
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
    User hmjBill

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
    User hmjBill
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

## 什么时候用它

- 要在自己机器上开 SSH，让别人（或自己的另一台设备）连进来。
- 本机的 SSH 服务起不来、要加固暴露面。

**这一节的所有命令都需要管理员 / root 权限。**

## 安装

### Windows

服务端装成系统能力，不做便携版（系统软件优先走系统安装）。落点 `C:\Windows\System32\OpenSSH\`。

```powershell
# 装（走 Windows Update，实测 6-7 分钟，别以为卡死）
Add-WindowsCapability -Online -Name 'OpenSSH.Server~~~~0.0.1.0'

# 确认
Get-WindowsCapability -Online -Name 'OpenSSH.Server*'
Test-Path "$env:WINDIR\System32\OpenSSH\sshd.exe"
Get-Service sshd -ErrorAction SilentlyContinue

# 生成主机密钥（不生成服务起不来）
& "$env:WINDIR\System32\OpenSSH\ssh-keygen.exe" -A
```

装完默认：`Stopped / Manual`，防火墙规则 `remote=Any`（**必须收紧**，见[防火墙](#防火墙放行范围)）。

### macOS

系统自带，配置在 `/etc/ssh/sshd_config`。

```bash
# 或在「系统设置 → 通用 → 共享 → 远程登录」里打开
sudo systemsetup -setremotelogin on
sudo systemsetup -getremotelogin       # 查状态

# 老系统可能还要加载 launchd 项
sudo launchctl load -w /System/Library/LaunchDaemons/ssh.plist
```

### Linux

```bash
# Debian / Ubuntu
sudo apt install openssh-server

# RHEL / Fedora / Rocky
sudo dnf install openssh-server

sudo systemctl enable --now sshd     # 开机自启并立即启动
sudo systemctl status sshd
```

生成 / 检查主机密钥：

```bash
sudo ssh-keygen -A        # 生成缺失的主机密钥
sudo sshd -t              # 配置语法检查（不启动）
```

## sshd_config 加固

配置文件位置：

| 平台 | 路径 |
| --- | --- |
| Windows | `C:\ProgramData\ssh\sshd_config` |
| macOS / Linux | `/etc/ssh/sshd_config` |

一份通用加固配置（Windows 上把 `Subsystem` 那行换成 `sftp-server.exe`）：

```text
Port 22
AddressFamily any

HostKey /etc/ssh/ssh_host_ed25519_key
HostKey /etc/ssh/ssh_host_rsa_key

LogLevel VERBOSE

# 只认公钥
PubkeyAuthentication yes
PasswordAuthentication no
PermitEmptyPasswords no
KbdInteractiveAuthentication no

LoginGraceTime 30
MaxAuthTries 3
MaxSessions 10

# 只允许指定账号（换成你的用户名）
AllowUsers hmjBill

X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
PermitTunnel no

Subsystem sftp sftp-server
```

| 指令 | 作用 |
| --- | --- |
| `PasswordAuthentication no` | 关密码登录。**最大的单点风险**——密码在任何可达网络上都能被暴力尝试 |
| `AllowUsers <名字>` | 白名单。不写的话任何本地账户都能登录 |
| `MaxAuthTries 3` | 每次连接最多试 3 次（默认 6） |
| `LoginGraceTime 30` | 登录窗口 30 秒（默认 2 分钟） |
| `AllowTcpForwarding no` | 关端口转发。**注意**：这也断掉了客户端的 `-L`/`-R`，需要就改成 `yes` 或 `local`/`remote` |
| `PermitTunnel no` | 关 tun 设备 |

改完必须重启才生效：

```powershell
Restart-Service sshd               # Windows
```

```bash
sudo systemctl restart sshd        # Linux / macOS
```

> **Windows 上改配置前先停服务**。sshd 运行时会锁住 `sshd_config`，此时写入不报错但内容进不去。

## 公钥认证

### 把你的公钥放上去

```bash
# Linux / macOS / Git Bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server
```

```powershell
# Windows 原生（无 ssh-copy-id）
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub" |
    ssh user@server "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

```bash
# bash 下的等价写法
cat ~/.ssh/id_ed25519.pub | ssh user@server "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

### Linux / macOS 权限

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
chmod go-w ~              # 家目录不能组或其他人可写
```

### Windows 的坑：管理员读的是共享文件

Windows OpenSSH 对 **Administrators 组成员**改读 `C:\ProgramData\ssh\administrators_authorized_keys`，
不读各自的用户目录。所以公钥放进 `~/.ssh/authorized_keys` **不会生效**。

`sshd_config` 里要有对应段（Windows 默认配置已含）：

```text
Match Group administrators
       AuthorizedKeysFile __PROGRAMDATA__/ssh/administrators_authorized_keys
```

### Windows 主机密钥 ACL（本节最容易翻车的地方）

**Windows 的 StrictModes 同时检查属主和 DACL，两者都要对，缺一个就全盘拒绝。**
只要有一把主机密钥被判不合格，sshd 就丢弃它；全部不合格时报
`sshd: no hostkeys available -- exiting.`，事件日志里只剩 7034，什么原因都不写。

实测确认的要求（2026.10 在 Windows 11 build 26200 + OpenSSH 9.5p2 上验证）：

| 对象 | 属主 | 访问控制项 |
| --- | --- | --- |
| `ssh_host_*_key`（私钥） | `SYSTEM` | `SYSTEM:(F)` **和** `BUILTIN\Administrators:(F)` |
| `ssh_host_*_key.pub`（公钥） | `Administrators` | 同上 |
| `sshd_config`、`administrators_authorized_keys` | `Administrators` | 同上 |
| `C:\ProgramData\ssh` 目录 | `Administrators` | 同上，带 `(OI)(CI)` 让子文件继承 |

**两个常见误解，都会导致密钥被拒：**

1. **只给 SYSTEM 一条不够。** 很多人（包括按直觉加固的自己）会「收紧」到只有 SYSTEM 能读，
   结果 sshd 报 `too open` / `bad permissions`。规则是 **SYSTEM 与 Administrators 必须同时有完全控制**，
   多一条少一条都不行。
2. **属主错了也不行。** 私钥属主必须是 SYSTEM。属主是普通用户账号时同样被判过松。

用 .NET ACL API 一次设完，别用 `icacls`：

```powershell
$SYS = New-Object System.Security.Principal.SecurityIdentifier('S-1-5-18')        # SYSTEM
$ADM = New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-544')      # Administrators

function Set-FullAcl([string]$path, [string]$ownerSid, [bool]$isDir) {
    $acl = Get-Acl $path
    $acl.SetAccessRuleProtection($true, $false)     # 关继承，同时丢弃继承来的 ACE
    foreach ($r in @($acl.Access)) { [void]$acl.RemoveAccessRule($r) }
    $acl.SetOwner((New-Object System.Security.Principal.SecurityIdentifier($ownerSid)))
    if ($isDir) {
        $inherit = [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
    } else {
        $inherit = [System.Security.AccessControl.InheritanceFlags]::None
    }
    foreach ($sid in @($SYS, $ADM)) {
        [void]$acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule(
            $sid, 'FullControl', $inherit,
            [System.Security.AccessControl.PropagationFlags]::None, 'Allow')))
    }
    Set-Acl -Path $path -AclObject $acl
}

# 私钥属主 SYSTEM
foreach ($n in 'ssh_host_rsa_key','ssh_host_ecdsa_key','ssh_host_ed25519_key') {
    Set-FullAcl "C:\ProgramData\ssh\$n" 'S-1-5-18' $false
}
# 其余属主 Administrators
foreach ($n in 'sshd_config','administrators_authorized_keys',
                'ssh_host_rsa_key.pub','ssh_host_ecdsa_key.pub','ssh_host_ed25519_key.pub') {
    Set-FullAcl "C:\ProgramData\ssh\$n" 'S-1-5-32-544' $false
}
Set-FullAcl 'C:\ProgramData\ssh' 'S-1-5-32-544' $true
```

#### 为什么不用 icacls

`icacls` 的组合命令有两个陷阱，都会静默产出错误 ACL：

1. **`/reset` 之后接 `/inheritance:r` 会留下空 DACL**（SDDL 变成 `D:PAI`，一条权限都没有）。
   此时连提权管理员都读不到文件，后续 `/grant` 也会报「拒绝访问」而加不进去。
2. **`/grant:r` 是「替换」不是「追加」**。`/grant SYSTEM:(F) Administrators:(F)` 写成 `/grant:r` 时，
   第二条会把第一条顶掉，最后只剩 Administrators 一条——正好触发 `too open`。

排查时直接看 SDDL，一眼就知道有没有坏：

```powershell
Get-Acl 'C:\ProgramData\ssh\sshd_config' | Select-Object Owner, Sddl
# 正常： O:BAG:...D:PAI(A;;FA;;;SY)(A;;FA;;;BA)
# 坏掉： O:BAG:...D:PAI              <- 没有任何 ACE
```

验证是否过关，直接跑语法检查即可（**必须在服务停止时**）：

```powershell
& "$env:WINDIR\System32\OpenSSH\sshd.exe" -t -f C:\ProgramData\ssh\sshd_config
# exit=0 且无输出 = 全部接受
# 有 UNPROTECTED PRIVATE KEY / no hostkeys available = ACL 仍不对
```

## 防火墙放行范围

装完自带的规则通常是 `remote=Any`，**任何能路由到这台机器的来源都能敲 22 端口**。删掉它，按网段重建。

```powershell
# Windows PowerShell
Remove-NetFirewallRule -Name 'OpenSSH-Server-In-TCP'

# 家里 WiFi：仅 Private 配置文件
New-NetFirewallRule -Name 'OpenSSH-Server-In-TCP-LAN' `
    -DisplayName 'OpenSSH Server (sshd) from LAN' `
    -Direction Inbound -Action Allow -Protocol TCP -LocalPort 22 `
    -RemoteAddress '192.168.0.0/24' -Profile Private -Enabled True

# ZeroTier 虚拟网：网卡类别是 Public，所以 Profile 用 Any
New-NetFirewallRule -Name 'OpenSSH-Server-In-TCP-ZeroTier' `
    -DisplayName 'OpenSSH Server (sshd) from ZeroTier' `
    -Direction Inbound -Action Allow -Protocol TCP -LocalPort 22 `
    -RemoteAddress '10.112.43.0/24' -Profile Any -Enabled True
```

```bash
# Linux: ufw
sudo ufw allow from 192.168.0.0/24 to any port 22 proto tcp
sudo ufw enable

# Linux: firewalld
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.0.0/24" port port="22" protocol="tcp" accept'
sudo firewall-cmd --reload

# macOS: 系统设置 → 网络 → 防火墙
```

网段从 `Get-NetIPAddress -AddressFamily IPv4`（Windows）或 `ip addr`（Linux）取。
注意虚拟网卡（ZeroTier、WSL、Hyper-V、Docker）也在里面，别把 `169.254.*` 和容器网段当成放行目标。

**公网服务器另说**：云主机除了系统防火墙，还有厂商的**安全组**（AWS / Azure / GCP / 阿里云等）。
安全组不放行，系统内配得再对也连不上。两层是独立的，排查时都查。

**零信任网段（ZeroTier、WireGuard、Tailscale）也只对授权成员开放**，
所以「开自启 + 只放行 ZeroTier」并不比「手动开」风险高多少。
真正决定风险的是「放行范围」和「认证方式」，不是「服务开不开」。

## 服务管理

```powershell
# Windows PowerShell
Get-Service sshd                              # 看状态
Start-Service sshd                            # 开
Stop-Service sshd                             # 关
Restart-Service sshd                          # 重载配置
Set-Service -Name sshd -StartupType Manual     # 手动（默认，也是推荐）
Set-Service -Name sshd -StartupType Automatic  # 开机自启
```

```bash
# Linux / macOS
sudo systemctl status sshd
sudo systemctl start sshd
sudo systemctl stop sshd
sudo systemctl restart sshd
sudo systemctl enable sshd     # 开机自启
sudo systemctl disable sshd    # 取消自启
```

选哪个取决于你怎么用：

| 用法 | 设置 | 说明 |
| --- | --- | --- |
| 坐在电脑前才用 | 手动 / `Manual` | 不用时端口不监听，零攻击面 |
| 想在外面直接 SSH 进来 | 自启 / `Automatic` | 开机就在；先鸡后蛋问题不存在了 |

> **注意「手动」的陷阱**：服务没开时，**你没法从外面 SSH 进来把它开起来**。
> 如果你需要「在外面随时能连」，就设自启。

## 服务起不来时怎么定位

**这是服务端部分最有价值的部分。** `Start-Service sshd` / `systemctl start sshd` 失败时，
**事件日志通常只有「服务意外终止」，没有任何原因**——因为 sshd 在写日志前就死了。

### 第 1 步：抓 sshd 自己的 stderr

服务方式启动的进程不继承你的重定向句柄，所以抓不到。用计划任务以 SYSTEM 跑就能抓到：

```powershell
# Windows
$wrap = "$env:TEMP\probe.cmd"
Set-Content -Encoding ASCII -Value @"
@echo off
"$env:WINDIR\System32\OpenSSH\sshd.exe" -D -f C:\ProgramData\ssh\sshd_config > "$env:TEMP\out.txt" 2> "$env:TEMP\err.txt"
echo %ERRORLEVEL% > "$env:TEMP\rc.txt"
"@
Register-ScheduledTask -TaskName SshdProbe `
    -Action (New-ScheduledTaskAction -Execute $wrap -WorkingDirectory 'C:\ProgramData\ssh') `
    -Settings (New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 1)) `
    -User SYSTEM -RunLevel Highest -Force
Start-ScheduledTask -TaskName SshdProbe
Start-Sleep -Seconds 8
Get-Content "$env:TEMP\err.txt"
Unregister-ScheduledTask -TaskName SshdProbe -Confirm:$false
```

```bash
# Linux / macOS：直接前台跑就能看到
sudo /usr/sbin/sshd -D -d
```

看到什么就说明什么：

| 输出 | 真实原因 |
| --- | --- |
| `UNPROTECTED PRIVATE KEY FILE! ... too open` | Windows 主机密钥 ACL / 属主不对，见上文 |
| `no hostkeys available -- exiting` | 全部主机密钥被拒，先修 ACL |
| `Missing privilege separation directory` | Linux 上 `/run/sshd` 不存在，`sudo mkdir -p /run/sshd` |
| `Permission denied` 读配置 | 配置或目录权限不含服务账户 |
| **空的，但退出码非 0** | 进程在执行代码前就被杀，往权限 / 网络方向查 |

### 第 2 步：对照实验

用这个区分「配置错」还是「环境问题」：

```bash
# 以当前用户跑（服务模式，不加 -D）
sudo /usr/sbin/sshd -f /etc/ssh/sshd_config
# 成功监听 = 配置本身没问题，问题在服务 / 会话环境
```

| SYSTEM / root | 当前用户 | 结论 |
| --- | --- | --- |
| 失败 | 成功 | 配置 OK，服务环境问题 |
| 失败（报权限） | 成功 | 权限 / StrictModes |
| 都失败 | 都失败 | 配置或密钥本身有问题 |

### 第 3 步：排除干扰项

```bash
# 端口有没有被占
netstat -ano | grep ':22 '            # Windows
netstat -tlnp | grep ':22 '           # Linux

# 端口是否落在系统保留范围
netsh interface ipv4 show excludedportrange protocol=tcp   # Windows

# 主机密钥是否完整、配置是否合法
ls -l /etc/ssh/ssh_host_*             # Linux
sudo sshd -t

# 系统日志
sudo journalctl -u sshd -n 50 --no-pager                                       # Linux
```

```powershell
# Windows 系统日志
Get-WinEvent -LogName 'System' -MaxEvents 20 | Where-Object Message -match sshd
```

`lookup_sid() failed: 1332` 在 Windows 的 `sshd -t -d` 输出里属于**噪音**，
它枚举全系统账户时遇到解析不了的 SID，与服务起不来无关，别顺着它查 profile 残留。

## 验证：必须真连一次

配置写完、服务显示 Running 都**不能**证明能用。一定要真的连：

```powershell
# 1. loopback 通 + 公钥能登录：期望打印用户名、主机名和 SSH_LOGIN_OK，exit=0
& "$env:WINDIR\OpenSSH\ssh.exe" -i "$env:USERPROFILE\.ssh\id_ed25519" `
    -p 22 -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL `
    -o ConnectTimeout=10 'hmjBill@127.0.0.1' 'whoami && hostname && echo SSH_LOGIN_OK'

# 2. 负向测试：密码认证必须被拒。期望 Permission denied，exit=255
& "$env:WINDIR\OpenSSH\ssh.exe" -p 22 -o BatchMode=yes `
    -o PreferredAuthentications=password -o PubkeyAuthentication=no `
    -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL `
    -o ConnectTimeout=10 'hmjBill@127.0.0.1' 'echo SHOULD_NOT_WORK'

# 3. 真实网段：确认防火墙放行真的生效（loopback 绕过防火墙，测不到）
& "$env:WINDIR\OpenSSH\ssh.exe" -i "$env:USERPROFILE\.ssh\id_ed25519" `
    -p 22 -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL `
    -o ConnectTimeout=10 'hmjBill@192.168.0.5' 'echo LAN_OK'
```

```bash
# Linux / macOS：同样三条，把 -i 和路径换成 Unix 风格
ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 \
    'hmjBill@127.0.0.1' 'whoami && hostname && echo SSH_LOGIN_OK'
```

**验收标准**：第 1 条 exit=0 且打印 `SSH_LOGIN_OK`；第 2 条 exit=255 且是 `Permission denied`。

三个注意点：

1. 在 Git Bash / MSYS 里调 Windows 版 `ssh.exe`，`-i` 必须给 **Windows 路径**
   （`C:\Users\...\id_ed25519`）。给 `/c/Users/...` 会报 `Identity file ... not accessible`。
2. 远程命令里不要用 `;` 分隔（Windows 会当成 `whoami /;`），用 `&&`。
3. **loopback 绕过防火墙**，测不出放行范围。必须再用真实网段 IP 连一次。

---

# 服务端排障

| 症状 | 原因 | 动作 |
| --- | --- | --- |
| 服务起不来，日志只有 7034 / `terminated unexpectedly` | sshd 死前没写日志 | 用上面「抓 stderr」的办法 |
| `no hostkeys available` | 主机密钥 ACL 或属主不对（Windows） | 按 ACL 表逐项核对，看 SDDL |
| `too open` / `bad permissions` | 只改了一半（少了 Administrators，或属主没改） | 同上 |
| `sshd_config: Permission denied` | 该文件 DACL 是空的（SDDL 为 `D:PAI`） | `icacls /reset` 接 `/inheritance:r` 造成，用 .NET API 重建 |
| 写完配置读回来还是旧内容 | sshd 锁着配置文件（Windows） | 先 `Stop-Service sshd` 再写 |
| `Missing privilege separation directory`（Linux） | `/run/sshd` 不存在 | `sudo mkdir -p /run/sshd && sudo chmod 755 /run/sshd` |
| 公钥放对了却登不进去（Windows） | 你是管理员，sshd 读的是共享文件 | 公钥写进 `C:\ProgramData\ssh\administrators_authorized_keys` |
| 公钥放对了却登不进去（Linux） | 家目录或 `.ssh` 权限过松 | `chmod go-w ~ && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys` |
| `Permission denied (publickey)` 且私钥能读 | `AllowUsers` 拼写 / 用户名不符 | 服务端 `sshd -T \| grep allowusers` |
| 改完配置没生效 | 服务没重读 | `Restart-Service sshd` / `systemctl restart sshd` |
| 公网机器本地能连、外面连不上 | 云厂商安全组没放行 | 查安全组入站规则，这是独立于系统防火墙的一层 |

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
