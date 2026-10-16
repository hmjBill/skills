# OpenSSH 服务端：部署与加固

在**自己的**机器上部署、加固、排查 OpenSSH Server（sshd），让别人连进来。
客户端连服务器的用法见主 SKILL.md。

所有命令都需要管理员 / root 权限。

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
AllowUsers <用户名>

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
    -o ConnectTimeout=10 '<用户名>@127.0.0.1' 'whoami && hostname && echo SSH_LOGIN_OK'

# 2. 负向测试：密码认证必须被拒。期望 Permission denied，exit=255
& "$env:WINDIR\OpenSSH\ssh.exe" -p 22 -o BatchMode=yes `
    -o PreferredAuthentications=password -o PubkeyAuthentication=no `
    -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL `
    -o ConnectTimeout=10 '<用户名>@127.0.0.1' 'echo SHOULD_NOT_WORK'

# 3. 真实网段：确认防火墙放行真的生效（loopback 绕过防火墙，测不到）
& "$env:WINDIR\OpenSSH\ssh.exe" -i "$env:USERPROFILE\.ssh\id_ed25519" `
    -p 22 -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL `
    -o ConnectTimeout=10 '<用户名>@192.168.0.5' 'echo LAN_OK'
```

```bash
# Linux / macOS：同样三条，把 -i 和路径换成 Unix 风格
ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 \
    '<用户名>@127.0.0.1' 'whoami && hostname && echo SSH_LOGIN_OK'
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
