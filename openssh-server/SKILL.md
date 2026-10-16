---
name: openssh-server
description: 在 Windows 11 上部署并加固 OpenSSH Server：装成系统可选功能、sshd_config 只认公钥、主机密钥 ACL 属主踩坑、防火墙按网段放行、sshd 服务起不来的定位与实测验证，Windows 优先
---

# OpenSSH Server 部署与加固

在 Windows 11 上把 OpenSSH Server 装成系统能力、配好只认公钥的 `sshd_config`、把防火墙收窄到指定网段，
并**用真实 ssh 连接验证**而不是只看配置写没写对。

最费时间的不是写配置，是**让 `sshd` 服务真的能起来**——Windows 上这一步的失败原因几乎不会写进事件日志，
必须用特定手段才能看到（下文「服务起不来」一节）。

## 什么时候用它

- 要让 Windows 机器能被 SSH 登录（远程运维、传文件、给 Agent 当执行后端）。
- `ssh` 客户端已装但 `sshd` 服务起不来，要定位原因。
- 要收紧一台已装 OpenSSH Server 的机器的暴露面与认证方式。

**不适用**：Linux/macOS 的 sshd 配置（那边没有 Windows 那套 ACL 与 `administrators_authorized_keys` 规则）；
需要图形界面的远程操作（那是 RDP 的活）；给第三方开账号（本技能是单人单账号加固，不是多用户托管方案）。

## 平台与系统要求

| 平台 | 支持 | 说明 |
| --- | --- | --- |
| Windows 10 / 11 | ✅ | 本技能主要目标；服务端装成 `OpenSSH.Server` 可选功能 |
| macOS / Linux | 部分 | 系统自带 sshd，配置路径与 ACL 规则完全不同，见文末对照 |

前置条件：管理员权限。本技能所有 `Add-WindowsCapability` / `icacls` / `Set-Acl` 都需要提权。

## 安装

系统软件优先走系统安装，不做便携版。服务端落点是 `C:\Windows\System32\OpenSSH\`，属于系统位置。

```powershell
# 装 OpenSSH Server 可选功能。走 Windows Update，实测约 6-7 分钟，别以为卡死
Add-WindowsCapability -Online -Name 'OpenSSH.Server~~~~0.0.1.0'

# 确认：能力状态、sshd.exe 是否落地、服务是否已注册
Get-WindowsCapability -Online -Name 'OpenSSH.Server*'
Test-Path "$env:WINDIR\System32\OpenSSH\sshd.exe"
Get-Service sshd -ErrorAction SilentlyContinue
```

装完的默认状态（实测 Windows 11 build 26200）：

| 项 | 装完的值 | 说明 |
| --- | --- | --- |
| `sshd` 服务 | `Stopped / Manual` | 不会自启，符合「按需开」 |
| 防火墙规则 | `OpenSSH-Server-In-TCP`，`remote=Any` | **必须收紧**，见下文 |
| `C:\ProgramData\ssh` | 只有空的 `logs` 子目录 | 真正的配置在服务首次启动后才生成 |

客户端和装在同一个目录（`ssh.exe`、`ssh-keygen.exe` 等）。若机器上已有客户端，
`Get-WindowsCapability -Online -Name 'OpenSSH.Client*'` 会显示 `Installed`，**不需要重装**。

生成主机密钥（不生成服务起不来）：

```powershell
# -A 一次生成 rsa / ecdsa / ed25519 三对，放在 C:\ProgramData\ssh\
& "$env:WINDIR\System32\OpenSSH\ssh-keygen.exe" -A
```

## sshd_config 加固

写到 `C:\ProgramData\ssh\sshd_config`。以下是实测可用的完整内容：

```text
Port 22
AddressFamily any

HostKey __PROGRAMDATA__/ssh/ssh_host_rsa_key
HostKey __PROGRAMDATA__/ssh/ssh_host_ecdsa_key
HostKey __PROGRAMDATA__/ssh/ssh_host_ed25519_key

LogLevel VERBOSE

# 只认公钥。PasswordAuthentication 是最大风险：密码可在任何可达网络上被暴力尝试
PubkeyAuthentication yes
PasswordAuthentication no
PermitEmptyPasswords no
KbdInteractiveAuthentication no

LoginGraceTime 30
MaxAuthTries 3
MaxSessions 10

# 只允许这一个账号登录
AllowUsers <你的用户名>

# 关掉转发与 X11，减少可被利用的面
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
PermitTunnel no

Subsystem sftp sftp-server.exe

# Windows 特有：管理员组成员从共享文件读公钥，而不是各自的用户目录
Match Group administrators
       AuthorizedKeysFile __PROGRAMDATA__/ssh/administrators_authorized_keys
```

**`Match Group administrators` 这段不能省。** Windows OpenSSH 对管理员组成员改读
`C:\ProgramData\ssh\administrators_authorized_keys`。你的账号在 Administrators 组里，
把公钥放进 `~/.ssh/authorized_keys` 不会生效——这是「公钥明明放对了却登不进去」最常见的原因。

## 公钥认证

```powershell
# 生成用户密钥对。用系统那份 ssh-keygen，别用 PATH 里可能存在的 Git 自带版本
& "$env:WINDIR\System32\OpenSSH\ssh-keygen.exe" -t ed25519 -a 100 `
    -f "$env:USERPROFILE\.ssh\id_ed25519_hmjBill" -C "<用户>@<主机名>" -N '""'

# 公钥写进共享文件（因为上面 Match 了 administrators 组）
Get-Content "$env:USERPROFILE\.ssh\id_ed25519_hmjBill.pub" -Raw |
    ForEach-Object { $_.Trim() } |
    Set-Content -Path 'C:\ProgramData\ssh\administrators_authorized_keys' -Encoding ASCII
```

生成后记下指纹，之后核对用：

```powershell
& "$env:WINDIR\System32\OpenSSH\ssh-keygen.exe" -lf "$env:USERPROFILE\.ssh\id_ed25519_hmjBill"
```

## 主机密钥 ACL：最容易踩的坑

**Windows OpenSSH 的 StrictModes 同时检查属主和 DACL，两者都要对，缺一个就全盘拒绝。**
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

### 为什么不用 icacls

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

验证是否过关，直接跑语法检查即可（**必须在服务停止时**，见下）：

```powershell
& "$env:WINDIR\System32\OpenSSH\sshd.exe" -t -f C:\ProgramData\ssh\sshd_config
# exit=0 且无输出 = 全部接受
# 有 UNPROTECTED PRIVATE KEY / no hostkeys available = ACL 仍不对
```

## 防火墙放行范围

装完自带的规则是 `remote=Any`，**任何能路由到这台机器的来源都能敲 22 端口**。删掉它，按网段重建：

```powershell
# 删掉微软默认的 Any 规则
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

网段从 `Get-NetIPAddress -AddressFamily IPv4` 取。注意虚拟网卡（ZeroTier、WSL、Hyper-V）也在里面，
别把 `169.254.*` 和 `172.2x/172.3x` 的容器网段当成放行目标。

**零信任网段（ZeroTier）也只对授权成员开放**，所以「开自启 + 只放行 ZeroTier」并不比「手动开」风险高多少，
真正决定风险的是「放行范围」和「认证方式」，不是「服务开不开」。

## 服务管理

```powershell
Get-Service sshd                          # 看状态
Start-Service sshd                        # 开
Stop-Service sshd                         # 关
Set-Service -Name sshd -StartupType Manual    # 手动（默认，也是推荐）
Set-Service -Name sshd -StartupType Automatic # 开机自启
```

选哪个取决于你怎么用：

| 用法 | 设置 | 说明 |
| --- | --- | --- |
| 坐在电脑前才用 | `Manual` | 不用时 22 端口不监听，零攻击面 |
| 想在外面直接 SSH 进来 | `Automatic` | 开机就在；先鸡后蛋问题不存在了 |

改完 `sshd_config` 必须重启才生效：

```powershell
Restart-Service sshd
```

## 服务起不来时怎么定位

这是本技能最有价值的部分。`Start-Service sshd` 报「无法启动服务」时，
**事件日志只有 `7034 服务意外终止`，没有任何原因**——因为 sshd 在写日志前就死了。

定位手段，按信息量排序：

### 1. 以 SYSTEM 身份手动跑，抓 stderr（最有效）

服务的 stderr 抓不到，但用计划任务以 SYSTEM 跑就能抓到：

```powershell
$wrap = "$env:TEMP\probe.cmd"
Set-Content -Encoding ASCII -Value @"
@echo off
"$env:WINDIR\System32\OpenSSH\sshd.exe" -D -f C:\ProgramData\ssh\sshd_config > "$env:TEMP\out.txt" 2> "$env:TEMP\err.txt"
echo %ERRORLEVEL% > "$env:TEMP\rc.txt"
"@
Register-ScheduledTask -TaskName SshdProbe -Action (New-ScheduledTaskAction -Execute $wrap -WorkingDirectory 'C:\ProgramData\ssh') `
    -Settings (New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 1)) -User SYSTEM -RunLevel Highest -Force
Start-ScheduledTask -TaskName SshdProbe
Start-Sleep -Seconds 8
Get-Content "$env:TEMP\err.txt"
Unregister-ScheduledTask -TaskName SshdProbe -Confirm:$false
```

看到什么就说明什么：

| stderr 内容 | 真实原因 |
| --- | --- |
| `UNPROTECTED PRIVATE KEY FILE! ... too open` | 主机密钥 ACL/属主不对，见上文 |
| `no hostkeys available -- exiting` | 全部主机密钥被拒，先修 ACL |
| `Permission denied` 读配置 | 配置或目录 ACL 不含服务账户 |
| **空的，但退出码非 0** | 进程在执行代码前就被杀，往权限/网络方向查 |

### 2. 对照实验：同一二进制换个身份跑

用这个区分「配置错」还是「环境问题」：

```powershell
# 以当前用户跑（服务模式，不加 -D）
& "$env:WINDIR\System32\OpenSSH\sshd.exe" -f C:\ProgramData\ssh\sshd_config
# 成功监听 = 配置本身没问题，问题在服务/会话环境
```

三组结果各有含义：

| SYSTEM | 当前用户 | 结论 |
| --- | --- | --- |
| 失败 | 成功 | 配置 OK，服务环境问题（Session 0 / 服务账户 / 网络绑定） |
| 失败（报权限） | 成功 | StrictModes 或 ACL，服务身份读不到 |
| 都失败 | 都失败 | 配置或密钥本身有问题 |

### 3. 排除干扰项

```powershell
# 端口有没有被占 / 在不在排除范围
netstat -ano | Select-String ':22\s'
netsh interface ipv4 show excludedportrange protocol=tcp
# 宿主机密钥是否完整
Get-AuthenticodeSignature "$env:WINDIR\System32\OpenSSH\sshd.exe" | Select-Object Status,SignerCertificate
Get-Service ssh-agent   # 对照：同目录同家族的 ssh-agent 能跑吗
```

`lookup_sid() failed: 1332` 这行出现在 `sshd -t -d` 输出里属于**噪音**，
它枚举全系统账户时遇到解析不了的 SID，与服务起不来无关，别顺着它查profile残留。

## 验证：必须真连一次

配置写完、服务显示 Running 都**不能**证明能用。一定要真的连：

```powershell
# 1. loopback 通 + 公钥能登录：期望打印用户名、主机名和 SSH_LOGIN_OK，exit=0
& "$env:WINDIR\System32\OpenSSH\ssh.exe" -i "$env:USERPROFILE\.ssh\id_ed25519_hmjBill" `
    -p 22 -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL `
    -o ConnectTimeout=10 'hmjBill@127.0.0.1' 'whoami && hostname && echo SSH_LOGIN_OK'

# 2. 负向测试：密码认证必须被拒。期望 Permission denied，exit=255
& "$env:WINDIR\System32\OpenSSH\ssh.exe" -p 22 -o BatchMode=yes `
    -o PreferredAuthentications=password -o PubkeyAuthentication=no `
    -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL `
    -o ConnectTimeout=10 'hmjBill@127.0.0.1' 'echo SHOULD_NOT_WORK'

# 3. 真实网段：确认防火墙放行真的生效（loopback 绕过防火墙，测不到）
& "$env:WINDIR\System32\OpenSSH\ssh.exe" -i "$env:USERPROFILE\.ssh\id_ed25519_hmjBill" `
    -p 22 -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL `
    -o ConnectTimeout=10 'hmjBill@192.168.0.5' 'echo LAN_OK'
```

注意：在 Git Bash / MSYS 里调 Windows 版 `ssh.exe`，`-i` 必须给 **Windows 路径**
（`C:\Users\...\id_ed25519`）。给 `/c/Users/...` 会报 `Identity file ... not accessible`。

远程命令里不要用 `;` 分隔（会被 Windows 当成 `whoami /;`），用 `&&`。

## 命令速查

| 目的 | 命令 |
| --- | --- |
| 看能力状态 | `Get-WindowsCapability -Online -Name 'OpenSSH.Server*'` |
| 安装 | `Add-WindowsCapability -Online -Name 'OpenSSH.Server~~~~0.0.1.0'` |
| 卸载 | `Remove-WindowsCapability -Online -Name 'OpenSSH.Server~~~~0.0.1.0'` |
| 生成主机密钥 | `& "$env:WINDIR\System32\OpenSSH\ssh-keygen.exe" -A` |
| 配置语法检查 | `& "$env:WINDIR\System32\OpenSSH\sshd.exe" -t -f C:\ProgramData\ssh\sshd_config` |
| 详细调试输出 | 同上，加 `-d` |
| 服务启停 | `Start-Service sshd` / `Stop-Service sshd` |
| 设置自启 | `Set-Service -Name sshd -StartupType Automatic` |
| 看监听 | `Get-NetTCPConnection -LocalPort 22 -State Listen` |
| 看防火墙规则 | `Get-NetFirewallRule -Name '*SSH*' \| Get-NetFirewallAddressFilter` |
| 查登录日志 | `Get-WinEvent -LogName 'OpenSSH/Operational' -MaxEvents 20` |

## 排障

| 症状 | 原因 | 动作 |
| --- | --- | --- |
| `Start-Service` 报「无法启动」，日志只有 7034 | sshd 死前没写日志 | 用计划任务以 SYSTEM 跑，抓 stderr |
| stderr 报 `no hostkeys available` | 主机密钥 ACL 或属主不对 | 用 .NET API 设「属主 SYSTEM + SYSTEM 和 Administrators 都有 (F)」 |
| stderr 报 `too open` 但 ACL 看着没问题 | 只改了一半（少了 Administrators，或属主没改） | 按上面那张表逐项核对，看 SDDL |
| `sshd_config: Permission denied` | 该文件的 DACL 是空的（SDDL 为 `D:PAI`） | `icacls /reset` 接 `/inheritance:r` 造成，用 .NET API 重建 |
| 写完配置读回来还是旧内容 | sshd 运行时锁着 `sshd_config` | 先 `Stop-Service sshd` 再写，写完再启动 |
| 公钥放对了却登不进去 | 你是管理员，sshd 读的是共享文件 | 公钥写进 `C:\ProgramData\ssh\administrators_authorized_keys` |
| `Permission denied (publickey,...)` 且私钥能读 | 属主是 SYSTEM，服务外读不到属主信息 | 确认 `sshd_config` 里 `AllowUsers` 拼写、用户名与本机一致 |
| `Bad key, bad permissions` | 用户侧 `~/.ssh` 或私钥权限过松 | 私钥去掉继承，只留本人 |
| loopback 能连、外网不行 | 防火墙放行范围没覆盖来源 | 查 `Get-NetFirewallAddressFilter` 的 `RemoteAddress` |
| 改了 `sshd_config` 没生效 | 服务没重读 | `Restart-Service sshd` |
| 卸载后 `ssh` 命令消失 | 客户端与服务端是同一能力目录 | 卸载 Server 不影响 Client；反之亦然，先确认能力状态 |

## 注意事项

1. **关密码登录前先确认公钥真能登进去**，否则会把自己锁在门外。顺序是：先配好公钥 → 实测连上 → 再关密码。
2. **别把 `AllowUsers` 写错就启动**，写错会导致所有人都登不进，包括你自己。
3. **StrictModes 卡住时不要退而改用 `StrictModes no`**——那等于放弃主机密钥保护，是真实的安全降级。
4. **主机密钥不要重新生成**，除非确实要轮换。客户端 `known_hosts` 里存的是指纹，重新生成会让所有客户端报主机密钥变更。
5. **私钥等同于账号凭据**，不要贴进对话、提交进仓库或放进云同步目录。
6. **服务账户不要乱改**。改成普通账户会报 `7041 登录失败：没有分配「作为服务登录」的权限`，
   而 `LocalSystem` 正是读 SYSTEM 属主密钥的前提——两者要一起想，不能只改一头。
7. **`Add-WindowsCapability` 走 Windows Update，实测 6-7 分钟**，期间 `DismHost`/`TiWorker` 在跑是正常的，别重复触发。
8. 提权执行脚本时**脚本里不要写中文字面量**：Windows PowerShell 5.1 按 ANSI 读无 BOM 的 UTF-8 文件，
   整份解析失败且不报错，表现为「一条命令都没执行」。中文只放本文件。

## 已知坑（2026.10 实测）

1. **StrictModes 查属主 + DACL 两者，且 SYSTEM 与 Administrators 必须同时有完全控制。**
   「收紧到只有 SYSTEM」是错的，会触发 `too open` / `bad permissions`。用 .NET 的
   `SetOwner` + `SetAccessRuleProtection` + 逐条 `AddAccessRule` 一次建好。
2. **`icacls /reset` 接 `/inheritance:r` 会产生空 DACL**（SDDL 变成 `D:PAI`），
   连提权管理员都读不到，而且此时 `icacls` 自己都改不动（报「拒绝访问」）。
   看到 `sshd_config: Permission denied` 且你确实是管理员，先查 SDDL。
3. **`icacls /grant:r` 是替换不是追加**，一次写两条 ACE 时后一条会顶掉前一条。
   要两条都在就用 .NET API，或分两次 `/grant`。
4. **sshd 运行时会锁住 `sshd_config`**，此时 `WriteAllText` 不报错但内容写不进去
   （读回来还是旧内容，或字节数对不上）。改配置前先 `Stop-Service sshd`。
5. **`lookup_sid() failed: 1332` 是噪音**，与启动失败无关（实测删掉全部 ProfileList 孤儿 SID 后照样报）。
6. **`.ps1` 里混进 bash 语法会静默失败**。写 `<<<` 这类重定向符，PowerShell 解析失败且不生成日志文件，
   表现为「脚本什么都没做」。日志文件没生成 = 解析错误，不是运行时错误。
7. **`Start-Process -Verb RunAs` + `-RedirectStandardError` 抓不到服务进程的输出**，
   因为 SCM 启动的进程不继承重定向句柄。绕法是计划任务 + cmd 包装。
8. **别把「进程没出现」当成「sshd 崩了」**。观察整个启动过程若一次都没见到 `sshd.exe`，
   说明它在创建时就失败了，此时报错信息只能靠计划任务复现。
9. **loopback 测试绕过防火墙**，测不出放行范围。必须用真实网段 IP 再连一次。
10. **`-i` 传 MSYS 路径给 Windows 版 ssh.exe 会失败**，用 `C:\...` 形式。
11. **做对照实验后恢复文件要核对字节数**。恢复错了不会报错，只是配置悄悄变回默认——
    用 `git status`/字节数/`Get-Content` 三重确认，别信「restore 完成」的日志。
12. **Windows 默认配置里 `PasswordAuthentication` 是被注释的，即「启用」**。
    `#PasswordAuthentication yes` 里的注释不是关闭，删掉注释项前要确认当前实际值。

## macOS / Linux 对照

同样目标，路径与规则完全不同：

| 项 | Windows | macOS / Linux |
| --- | --- | --- |
| 安装 | `Add-WindowsCapability` | 系统自带；`brew install openssh` 或发行版包 |
| 服务 | `sshd`（Windows 服务） | `sshd` / `ssh.service`（systemd） |
| 配置 | `C:\ProgramData\ssh\sshd_config` | `/etc/ssh/sshd_config` |
| 主机密钥 | 同目录，`ssh-keygen -A` | `/etc/ssh/ssh_host_*_key` |
| 权限检查 | ACL 属主 + DACL（StrictModes） | `chmod 600` + 属主 |
| 管理员公钥 | `administrators_authorized_keys` | 无此概念，各自 `~/.ssh/authorized_keys` |
| 防火墙 | `New-NetFirewallRule` | `ufw` / `firewalld` |

```bash
# macOS / Linux：没有 ACL 坑，改权限即可
sudo ssh-keygen -A
sudo chmod 600 /etc/ssh/ssh_host_*_key
sudo systemctl enable --now sshd
ssh -o BatchMode=yes user@host 'echo OK'
```

**验证方法两边通用**：一定要真的连一次，并做一次「密码认证必须被拒」的负向测试。
