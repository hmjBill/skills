# tg 命令参考

> 本文件由 `tg docs --dir <目录> --format markdown` 从实际命令树生成，参数以二进制为准。
> 升级 tg 后重新生成一份覆盖本文件即可。

## 消息收发

### `tg send`

Send a message to a peer

```
tg send [flags] [text]
```

参数：

```
      --html                use HTML styling
      --nowebpage           disable generation of the webpage preview
  -p, --peer string         peer to write (username, phone, deep link, or id:<n>); default: yourself
      --schedule duration   schedule the message to be sent after this delay
      --silent              send this message silently (no notifications for the receivers)
```

### `tg reply`

Reply to a specific message

```
tg reply <peer> <message-id> <text> [flags]
```

参数：

```
      --html                use HTML styling
      --nowebpage           disable generation of the webpage preview
      --schedule duration   schedule the message to be sent after this delay
      --silent              send this message silently (no notifications for the receivers)
```

### `tg edit`

Edit a message

```
tg edit <peer> <message-id> <text> [flags]
```

参数：

```
      --html   use HTML styling
```

### `tg forward`

Forward messages to a peer

```
tg forward <to-peer> <message-id>... [flags]
```

参数：

```
      --drop-author   forward without quoting the original author
      --from string   source peer to forward from (required)
```

### `tg delete`

Delete one or more messages

```
tg delete <peer> <message-id>... [flags]
```

参数：

```
      --revoke   delete for everyone (not just your copy) (default true)
      --yes      confirm deletion
```

### `tg delete-history`

Delete a chat's history

```
tg delete-history <peer> [flags]
```

参数：

```
      --revoke   delete for everyone (not just your copy)
      --yes      confirm deletion
```

### `tg pin`

Pin a message

```
tg pin <peer> <message-id> [flags]
```

参数：

```
      --oneside   pin only on your side (private chats)
      --silent    pin without notifying members
```

### `tg unpin`

Unpin a message

```
tg unpin <peer> <message-id> [flags]
```

### `tg unpin-all`

Unpin all messages in a chat

```
tg unpin-all <peer> [flags]
```

参数：

```
      --yes    confirm unpinning all messages
```

### `tg pinned`

List pinned messages

```
tg pinned <peer> [flags]
```

参数：

```
  -n, --limit int   maximum number of pinned messages (default 50)
```

### `tg react`

React to a message with an emoji

```
tg react <peer> <message-id> <emoji> [flags]
```

### `tg unreact`

Remove your reaction from a message

```
tg unreact <peer> <message-id> [flags]
```

### `tg reactions`

Show reactions on a message

```
tg reactions <peer> <message-id> [flags]
```

### `tg read`

Mark a chat as read

```
tg read <peer> [flags]
```

### `tg history`

Read recent messages from a peer

```
tg history <peer> [flags]
```

参数：

```
  -n, --limit int   maximum number of messages to read (default 30)
```

### `tg search`

Search messages in a peer or globally

```
tg search <peer> <query> [flags]
```

参数：

```
  -g, --global      search across all chats (query only, no peer)
  -n, --limit int   maximum number of results (default 50)
```

### `tg context`

Show messages around a message

```
tg context <peer> <message-id> [flags]
```

参数：

```
  -r, --radius int   number of messages to show on each side (default 5)
```

### `tg link`

Get a public link to a message

```
tg link <peer> <message-id> [flags]
```

### `tg poll create`

Create a poll

```
tg poll create <peer> <question> <option> <option> [option...] [flags]
```

参数：

```
      --close-in duration   automatically close the poll after this duration
      --multiple            allow multiple answers
      --public              make votes public (non-anonymous)
```

### `tg schedule`

Manage scheduled messages

```
-h, --help   help for schedule
```

### `tg schedule send`

Schedule a message

```
tg schedule send <peer> <text> [flags]
```

参数：

```
      --at string     absolute time (RFC3339), e.g. 2027-01-01T00:00:00Z
      --in duration   relative delay from now, e.g. 2h
```

### `tg schedule list`

List scheduled messages

```
tg schedule list <peer> [flags]
```

### `tg schedule delete`

Delete scheduled messages

```
tg schedule delete <peer> <message-id>... [flags]
```

### `tg draft set`

Set the draft for a peer

```
tg draft set <peer> <text> [flags]
```

### `tg draft clear`

Clear the draft for a peer

```
tg draft clear <peer> [flags]
```

### `tg drafts`

List message drafts

```
tg drafts [flags]
```

### `tg upload`

Upload a file (or directory of files) to a peer

```
tg upload [flags] <path>
```

参数：

```
      --filename string     value of the filename attribute (defaults to the name from the given path)
      --html                use HTML styling
  -m, --message string      text message (caption) to send with the file
      --nowebpage           disable generation of the webpage preview
  -p, --peer string         peer to write (channel name, username, phone number or deep link); default: yourself
      --schedule duration   schedule the message to be sent after this delay
      --silent              send this message silently (no notifications for the receivers)
  -j, --threads int         concurrency limit (default 1)
      --type string         type of uploaded document (default: detect from MIME)
```

### `tg album`

Send multiple files as a grouped album

```
tg album <file> <file> [file...] [flags]
```

参数：

```
      --caption string   caption attached to the first item
  -p, --peer string      peer to send to; default: yourself
```

### `tg download`

Download media from a message

```
tg download <peer> <message-id> [flags]
```

参数：

```
      --out string   output file or directory (default: media filename in cwd)
```

### `tg watch`

Stream new messages as they arrive

```
tg watch [peer] [flags]
```

### `tg wait`

Block until a new message arrives

```
tg wait [peer] [flags]
```

参数：

```
      --timeout duration   give up after this duration (0 = wait forever)
```

### `tg stickers`

List installed sticker sets

```
tg stickers [flags]
```

## 会话与联系人

### `tg chats`

List and inspect chats

```
-h, --help   help for chats
```

### `tg chats list`

List dialogs with unread counts and flags

```
tg chats list [flags]
```

参数：

```
      --archived    list archived chats instead of the main list
  -n, --limit int   maximum number of chats to list (default 100)
```

### `tg chat`

Inspect a chat

```
-h, --help   help for chat
```

### `tg chat get`

Get basic chat info

```
tg chat get <peer> [flags]
```

### `tg chat full`

Get full chat info (about, participant count)

```
tg chat full <peer> [flags]
```

### `tg resolve`

Resolve a username to a peer

```
tg resolve <username> [flags]
```

### `tg search-public`

Search public chats and users

```
tg search-public <query> [flags]
```

参数：

```
  -n, --limit int   maximum number of results (default 20)
```

### `tg subscribe`

Join a public channel or group

```
tg subscribe <peer> [flags]
```

### `tg contacts`

Manage contacts

```
-h, --help   help for contacts
```

### `tg contacts list`

List your contacts

```
tg contacts list [flags]
```

### `tg contacts search`

Search your contacts

```
tg contacts search <query> [flags]
```

参数：

```
  -n, --limit int   maximum number of results (default 20)
```

### `tg contacts add`

Add a contact by phone number

```
tg contacts add <phone> <first-name> [last-name] [flags]
```

### `tg contacts delete`

Delete a contact

```
tg contacts delete <peer> [flags]
```

### `tg contacts import`

Import contacts from a CSV file (phone,first,last per line)

```
tg contacts import <file> [flags]
```

### `tg contacts block`

Block a peer

```
tg contacts block <peer> [flags]
```

### `tg contacts unblock`

Unblock a peer

```
tg contacts unblock <peer> [flags]
```

### `tg contacts blocked`

List blocked peers

```
tg contacts blocked [flags]
```

### `tg mute`

Mute a chat

```
tg mute <peer> [flags]
```

### `tg unmute`

Unmute a chat

```
tg unmute <peer> [flags]
```

### `tg archive`

Archive a chat

```
tg archive <peer> [flags]
```

### `tg unarchive`

Move a chat out of the archive

```
tg unarchive <peer> [flags]
```

## 群组与频道

### `tg create-group`

Create a basic group, optionally with members

```
tg create-group <title> [user]... [flags]
```

### `tg create-channel`

Create a channel or supergroup

```
tg create-channel <title> [flags]
```

参数：

```
      --about string   channel description
      --broadcast      create a broadcast channel (default: supergroup)
      --forum          enable forum topics (supergroups)
```

### `tg invite`

Invite users to a group or channel

```
tg invite <peer> <user>... [flags]
```

### `tg leave`

Leave a group or channel

```
tg leave <peer> [flags]
```

### `tg participants`

List members of a group or channel

```
tg participants <peer> [flags]
```

参数：

```
      --filter string   filter: recent, admins, banned, kicked, bots (default "recent")
  -n, --limit int       maximum number of participants (default 100)
```

### `tg admins`

List admins of a group or channel

```
tg admins <peer> [flags]
```

参数：

```
  -n, --limit int   maximum number of participants (default 100)
```

### `tg banned`

List banned users of a group or channel

```
tg banned <peer> [flags]
```

参数：

```
  -n, --limit int   maximum number of participants (default 100)
```

### `tg promote`

Promote a user to admin

```
tg promote <peer> <user> [flags]
```

参数：

```
      --rank string   custom admin rank/title
```

### `tg demote`

Remove a user's admin rights

```
tg demote <peer> <user> [flags]
```

### `tg ban`

Ban a user from a group or channel

```
tg ban <peer> <user> [flags]
```

### `tg unban`

Unban a user

```
tg unban <peer> <user> [flags]
```

### `tg slow-mode`

Set slow mode (0 to disable)

```
tg slow-mode <peer> <seconds> [flags]
```

### `tg set-title`

Change a chat's title

```
tg set-title <peer> <title> [flags]
```

### `tg set-about`

Change a chat's description

```
tg set-about <peer> <about> [flags]
```

### `tg set-photo`

Set a chat's photo

```
tg set-photo <peer> <file> [flags]
```

### `tg invite-link`

Manage a chat's invite link

```
-h, --help   help for invite-link
```

### `tg invite-link new`

Generate a new invite link

```
tg invite-link new <peer> [flags]
```

参数：

```
      --request        require admin approval for each join
      --title string   admin-only description for the link
```

### `tg invite-link show`

Show the current invite link

```
tg invite-link show <peer> [flags]
```

### `tg join-link`

Join a chat by invite link

```
tg join-link <invite-link> [flags]
```

### `tg topics`

Manage forum topics

```
-h, --help   help for topics
```

### `tg topics list`

List forum topics

```
tg topics list <peer> [flags]
```

### `tg topics create`

Create a forum topic

```
tg topics create <peer> <title> [flags]
```

### `tg topics enable`

Enable forum topics in a supergroup

```
tg topics enable <peer> [flags]
```

### `tg recent-actions`

Show the admin action log

```
tg recent-actions <peer> [flags]
```

参数：

```
  -n, --limit int   maximum number of events (default 50)
```

## 个人资料与文件夹

### `tg profile`

Manage your profile

```
-h, --help   help for profile
```

### `tg profile update`

Update your name and bio

```
tg profile update [flags]
```

参数：

```
      --about string        bio / about text
      --first-name string   first name
      --last-name string    last name
```

### `tg profile status`

Set your online/offline status

```
tg profile status [flags]
```

参数：

```
      --offline   mark as offline (default: online)
```

### `tg profile set-photo`

Set your profile photo

```
tg profile set-photo <file> [flags]
```

### `tg profile delete-photo`

Delete your current profile photo

```
tg profile delete-photo [flags]
```

### `tg folders`

Manage chat folders (dialog filters)

```
-h, --help   help for folders
```

### `tg folders list`

List chat folders

```
tg folders list [flags]
```

### `tg folders create`

Create a chat folder

```
tg folders create <title> [flags]
```

### `tg folders add-chat`

Add a chat to a folder

```
tg folders add-chat <folder-id> <peer> [flags]
```

### `tg folders remove-chat`

Remove a chat from a folder

```
tg folders remove-chat <folder-id> <peer> [flags]
```

### `tg folders delete`

Delete a chat folder

```
tg folders delete <folder-id> [flags]
```

### `tg folders reorder`

Reorder chat folders

```
tg folders reorder <folder-id>... [flags]
```

## 账号与设备

### `tg init`

Create the config file

```
tg init [flags]
```

参数：

```
      --app-hash string   telegram app hash (default: built-in)
      --app-id int        telegram app ID (default: built-in)
      --proxy string      optional proxy URL (socks5://, tg://proxy?...)
      --test              create the account against the telegram test server
      --token string      optional telegram bot token
```

### `tg login`

Authenticate a personal user session

```
tg login [flags]
```

参数：

```
      --password string   2FA cloud password (or set TG_PASSWORD)
      --phone string      phone-code login with this number (international format; use --phone= to be prompted)
```

### `tg logout`

Log out and remove the local session

```
tg logout [flags]
```

参数：

```
      --bot    log out the bot session instead of the user session
```

### `tg whoami`

Show the authenticated account

```
tg whoami [flags]
```

参数：

```
      --bot    use the bot session instead of the user session
```

### `tg accounts`

List and manage configured accounts

```
tg accounts [flags]
```

### `tg accounts add`

Add or update a named account

```
tg accounts add <label> [flags]
```

参数：

```
      --app-hash string   telegram app hash
      --app-id int        telegram app ID
      --proxy string      optional per-account proxy URL
      --test              create the account against the telegram test server
      --token string      optional bot token
```

### `tg accounts default`

Show or set the default account

```
tg accounts default [label] [flags]
```

### `tg accounts remove`

Remove a named account

```
tg accounts remove <label> [flags]
```

### `tg devices`

List active sessions (logged-in devices)

```
tg devices [flags]
```

### `tg devices terminate`

Terminate an active session by its hash

```
tg devices terminate <hash> [flags]
```

参数：

```
      --yes    confirm termination
```
