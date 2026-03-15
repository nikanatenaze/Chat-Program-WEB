import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { TokenModelInterface } from '../../interfaces/token-model.interface';
import { UserInterface } from '../../interfaces/user.interface';
import { ChatInterface } from '../../interfaces/chat.interface';
import { MessageInterface } from '../../interfaces/message.interface';
import { User } from '../../services/user';
import { ChatUserService } from '../../services/chat-user.service';
import { MainHubService } from '../../services/main-hub.service';
import { ChatService } from '../../services/chat.service';
import { MessageService } from '../../services/message.service';
import { NotificationService } from '../../services/notification.service';
import { BehaviorSubject, forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { GlobalMethods } from '../../classes/global-methods';

@Component({
  selector: 'app-messenger',
  templateUrl: './messenger.html',
  standalone: false,
  styleUrls: ['./messenger.css'],
})
export class Messenger implements OnInit, OnDestroy {

  // Auth / user basics
  public token: string = sessionStorage.getItem('token') ?? '';
  public tokenData!: TokenModelInterface;
  public userData!: UserInterface;

  // Chat list streams
  public userChats$ = new BehaviorSubject<ChatInterface[]>([]);
  public filteredChats$ = new BehaviorSubject<ChatInterface[]>([]);
  public selectedChatMessages$ = new BehaviorSubject<MessageInterface[]>([]);

  // Search & compose state
  public searchTerm = '';
  public newMessage = '';

  // Loading / in-flight flags
  public chatLoading = false;
  public chatsLoading = true;
  public isSending = false;

  // Inline message editing
  public editingMessageId: number | null = null;
  public editContent = '';

  // "Add people" slide-up panel (inside an open chat)
  public showAddUserPanel = false;
  public addUserSearch = '';
  public addUserResults: UserInterface[] = [];
  public addUserSelected = new Map<number, UserInterface>();
  public addUserSearching = false;
  public addUserAdding = false;
  private addUserDebounce: any;

  // "Create chat" modal state
  public showCreateChatModal = false;
  public createChatName = '';
  public createChatHasPassword = false;
  public createChatPassword = '';
  public createChatUserSearch = '';
  public createChatUserResults: UserInterface[] = [];
  public createChatSelected = new Map<number, UserInterface>();
  public createChatUserSearching = false;
  public createChatCreating = false;
  private createChatDebounce: any;

  // Scroll-to-bottom FAB
  public showScrollToBottom = false;
  @ViewChild('messagesContainer') messagesContainerRef!: ElementRef<HTMLDivElement>;

  // Mobile sidebar drawer state
  public panelOpen = false;

  // Currently open chat
  public selectedChat: ChatInterface | null = null;

  // Avatar / name lookup maps for people in the active chat
  private usersImageMap = new Map<number, string | null>();
  private usersNameMap = new Map<number, string>();

  // Incoming-message sound
  private receiveAudio = new Audio('message-recive-sound.mp3');

  constructor(
    public hub: MainHubService,
    public userService: User,
    public chatUserService: ChatUserService,
    public chatService: ChatService,
    public messageService: MessageService,
    public notification: NotificationService
  ) { }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Grab our own user info from the JWT, then kick off the rest of startup
    this.userService.getDataFromToken().subscribe(x => {
      this.tokenData = x;
      this.build();
    });
  }

  ngOnDestroy(): void {
    // Always clean up the SignalR connection when we leave
    this.hub.stopConnection()
      .then(() => console.log('SignalR disconnected'))
      .catch(err => console.error('SignalR disconnect error:', err));
  }

  // ─── Startup ─────────────────────────────────────────────────────────────────

  private async build() {
    await this.fetchData();
    this.applyFilter();
    await this.connectSignalR();
  }

  private async fetchData() {
    try {
      await this.fetchUser();
      await this.fetchChats();
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  }

  private fetchUser(): Promise<void> {
    return new Promise((res, rej) => {
      this.userService.getUserById(this.tokenData.id).subscribe({
        next: x => { this.userData = x; res(); },
        error: err => rej(err),
      });
    });
  }

  private fetchChats(): Promise<void> {
    return new Promise((res, rej) => {
      this.chatUserService.GetChatsOfUser().subscribe({
        next: x => {
          this.userChats$.next(x);
          this.applyFilter();
          this.chatsLoading = false;
          res();
        },
        error: err => rej(err),
      });
    });
  }

  // ─── SignalR ─────────────────────────────────────────────────────────────────

  private async connectSignalR() {
    await this.hub.startConnection(this.token);
    // Join the personal "chat-user" channel so we hear add/remove events
    await this.hub.joinChatUsers(this.userData.id);

    // Someone added us to a chat — update the sidebar list
    this.hub.onAddUser(data => {
      const updated = [...this.userChats$.value, data].sort((a, b) => a.id - b.id);
      this.userChats$.next(updated);
      this.applyFilter();
      this.notification.success(`You were added to "${data.name}"!`);
    });

    // We were removed from a chat — drop it from the sidebar
    this.hub.onRemoveUser(data => {
      this.userChats$.next(this.userChats$.value.filter(x => x.id !== data.id));
      this.applyFilter();
    });

    // A new message arrived in the active chat
    this.hub.onCreateMessage(data => {
      const mapped = this.mapMessage(data);
      this.selectedChatMessages$.next([...this.selectedChatMessages$.value, mapped]);

      // Play a subtle receive sound for messages from other people
      if (!mapped.isWriter) {
        this.receiveAudio.currentTime = 0;
        this.receiveAudio.volume = 0.4;
        this.receiveAudio.play().catch(() => { });
      }
      this.scrollToBottom();
    });

    // A message was deleted — remove it from the local list
    this.hub.onDeleteMessage(data => {
      this.selectedChatMessages$.next(
        this.selectedChatMessages$.value.filter(m => m.id !== data.id)
      );
    });

    // A message was edited — swap in the updated content
    this.hub.onEditMessage(data => {
      const updated = this.selectedChatMessages$.value.map(m =>
        m.id === data.id ? { ...m, content: data.content } : m
      );
      this.selectedChatMessages$.next(updated);
    });
  }

  // ─── Chat selection ───────────────────────────────────────────────────────────

  public selectChat(id: number) {
    this.closeAddUserPanel();
    this.closePanelMobile(); // close the sidebar drawer on mobile after picking a chat

    // Reset everything so the skeleton shows while the new chat loads
    this.chatLoading = true;
    this.selectedChat = null;
    this.selectedChatMessages$.next([]);
    this.usersImageMap.clear();
    this.usersNameMap.clear();

    this.chatService.GetChatById(id).subscribe(chat => {
      this.selectedChat = chat;
      // Leave the previous SignalR chat group and join the new one
      this.hub.leaveChat(chat.id);
      this.hub.joinChat(chat.id);

      // Preload avatars & names for everyone in this chat
      this.chatUserService.GetUsersInChat(chat.id).subscribe(users => {
        users.forEach(u => {
          this.usersImageMap.set(u.id, u.profileImageUrl ?? null);
          this.usersNameMap.set(u.id, u.name);
        });

        // Fetch the message history
        this.chatService.GetChatMessages(chat.id).subscribe(messages => {
          this.selectedChatMessages$.next(
            messages.map(x => this.mapMessage(x))
          );
          this.chatLoading = false;
          this.scrollToBottom();
        });
      });
    });
  }

  // Normalise a raw message from the server into our local shape
  private mapMessage(data: MessageInterface): MessageInterface {
    return {
      ...data,
      createdAt: GlobalMethods.formatDate(data.createdAt, false, true),
      isWriter: data.userId === this.userData?.id,
    };
  }

  // ─── Message display helpers ─────────────────────────────────────────────────

  /** Show the sender's name above the first bubble in a consecutive group */
  shouldShowSender(messages: MessageInterface[], index: number): boolean {
    const current = messages[index];
    if (current.isWriter) return false;
    if (index === 0) return true;
    return messages[index - 1].userId !== current.userId;
  }

  /** Show the avatar only on the last bubble of a consecutive group */
  shouldShowAvatar(messages: MessageInterface[], index: number): boolean {
    const current = messages[index];
    if (current.isWriter) return false;
    const next = messages[index + 1];
    return !next || next.userId !== current.userId;
  }

  getUserAvatar(userId: number): string | null {
    return this.usersImageMap.get(userId) ?? null;
  }

  getUserName(message: MessageInterface): string {
    const fromMap = this.usersNameMap.get(message.userId);
    if (fromMap) return fromMap;

    if (message.userName) return message.userName;

    // Lazily fetch the user if we somehow don't have them cached yet
    this.userService.getUserById(message.userId).subscribe(u => {
      this.usersNameMap.set(u.id, u.name);
      this.usersImageMap.set(u.id, u.profileImageUrl ?? null);
      // Nudge the stream to trigger a re-render with the now-resolved name
      this.selectedChatMessages$.next([...this.selectedChatMessages$.value]);
    });

    return '…';
  }

  getInitial(message: MessageInterface): string {
    return this.getUserName(message).charAt(0).toUpperCase();
  }

  // ─── Chat list search ─────────────────────────────────────────────────────────

  onSearch(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.applyFilter();
  }

  private applyFilter() {
    const term = this.searchTerm.toLowerCase();
    this.filteredChats$.next(
      this.userChats$.value.filter(c => !term || c.name.toLowerCase().includes(term))
    );
  }

  // ─── Sending messages ─────────────────────────────────────────────────────────

  public sendMessage() {
    if (!this.selectedChat || !this.newMessage.trim()) return;

    if (this.isSending) {
      this.notification.error('Slow down — wait for the previous message to send.');
      return;
    }

    this.isSending = true;
    const payload = {
      content: this.newMessage,
      userId: this.tokenData.id,
      chatId: this.selectedChat.id,
    };

    this.messageService.CreateMessage(payload).subscribe({
      next: () => {
        this.newMessage = '';
        this.isSending = false;
      },
      error: err => {
        console.error(err);
        this.isSending = false;
      },
    });

    this.scrollToBottom();
  }

  // ─── Inline editing ───────────────────────────────────────────────────────────

  public startEdit(message: MessageInterface) {
    this.editingMessageId = message.id;
    this.editContent = message.content;
    // Focus the textarea and move the cursor to the end
    setTimeout(() => {
      const el = document.getElementById(`edit-input-${message.id}`) as HTMLTextAreaElement;
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 30);
  }

  public cancelEdit() {
    this.editingMessageId = null;
    this.editContent = '';
  }

  public saveEdit(messageId: number) {
    const content = this.editContent.trim();
    if (!content) return;

    this.messageService.EditMessage({ id: messageId, content, userId: this.tokenData.id }).subscribe({
      next: updated => {
        const msgs = this.selectedChatMessages$.value.map(m =>
          m.id === messageId ? { ...m, content: updated.content } : m
        );
        this.selectedChatMessages$.next(msgs);
        this.cancelEdit();
      },
      error: () => this.notification.error('Failed to edit message.'),
    });
  }

  public deleteMessage(messageId: number) {
    Swal.fire({
      title: 'Delete message?',
      text: 'This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Delete',
    }).then(result => {
      if (result.isConfirmed) {
        this.messageService.DeleteMessage(messageId).subscribe({
          next: () => this.notification.success('Message deleted.'),
          error: () => this.notification.error('Failed to delete message.'),
        });
      }
    });
  }

  // ─── Create chat modal ────────────────────────────────────────────────────────

  openCreateChatModal() {
    this.showCreateChatModal = true;
    // Reset every field so the modal feels fresh each time
    this.createChatName = '';
    this.createChatHasPassword = false;
    this.createChatPassword = '';
    this.createChatUserSearch = '';
    this.createChatUserResults = [];
    this.createChatSelected.clear();
  }

  closeCreateChatModal() {
    this.showCreateChatModal = false;
    clearTimeout(this.createChatDebounce);
  }

  /** Debounced user search inside the "create chat" modal */
  onCreateChatUserSearch(event: Event) {
    this.createChatUserSearch = (event.target as HTMLInputElement).value;
    clearTimeout(this.createChatDebounce);
    const term = this.createChatUserSearch.trim();
    if (!term) { this.createChatUserResults = []; return; }

    this.createChatUserSearching = true;
    this.createChatDebounce = setTimeout(() => {
      this.userService.searchUserByName(term).subscribe({
        next: tokens => {
          if (!tokens.length) {
            this.createChatUserResults = [];
            this.createChatUserSearching = false;
            return;
          }
          forkJoin(tokens.map(t => this.userService.getUserById(t.id))).subscribe({
            next: users => {
              // Exclude ourselves from the list — no point adding the creator twice
              this.createChatUserResults = users.filter(u => u.id !== this.userData.id);
              this.createChatUserSearching = false;
            },
            error: () => { this.createChatUserSearching = false; }
          });
        },
        error: () => { this.createChatUserSearching = false; }
      });
    }, 280);
  }

  toggleCreateChatUser(user: UserInterface) {
    if (this.createChatSelected.has(user.id)) {
      this.createChatSelected.delete(user.id);
    } else {
      this.createChatSelected.set(user.id, user);
    }
    // Replace the map reference so Angular change detection picks it up
    this.createChatSelected = new Map(this.createChatSelected);
  }

  removeCreateChatChip(userId: number) {
    this.createChatSelected.delete(userId);
    this.createChatSelected = new Map(this.createChatSelected);
  }

  get createChatSelectedList(): UserInterface[] {
    return Array.from(this.createChatSelected.values());
  }

  confirmCreateChat() {
    const name = this.createChatName.trim();
    if (!name) return;
    if (this.createChatHasPassword && !this.createChatPassword) {
      this.notification.error('Please enter a password or turn off the password toggle.');
      return;
    }

    this.createChatCreating = true;
    const payload = {
      name,
      hasPassword: this.createChatHasPassword,
      password: this.createChatHasPassword ? this.createChatPassword : null,
      createdByUserId: Number(this.userData.id),
    };

    this.chatService.CreateChat(payload as any).subscribe({
      next: newChat => {
        this.notification.success('Chat created!');

        // Add the creator as the first member
        this.chatUserService.AddChatUser({ userId: newChat.createdByUserId, chatId: newChat.id }).subscribe({
          next: () => {
            const updated = [...this.userChats$.value, newChat].sort((a, b) => a.id - b.id);
            this.userChats$.next(updated);
            this.applyFilter();

            // Now add everyone the user selected during creation
            const invitees = Array.from(this.createChatSelected.values());
            if (!invitees.length) {
              this.createChatCreating = false;
              this.closeCreateChatModal();
              return;
            }

            let done = 0;
            let failed = 0;
            invitees.forEach(user => {
              this.chatUserService.AddChatUser({ userId: user.id, chatId: newChat.id }).subscribe({
                next: () => {
                  done++;
                  if (done + failed === invitees.length) {
                    this.createChatCreating = false;
                    if (failed) this.notification.error(`${failed} invite${failed > 1 ? 's' : ''} failed.`);
                    this.closeCreateChatModal();
                  }
                },
                error: () => {
                  failed++;
                  if (done + failed === invitees.length) {
                    this.createChatCreating = false;
                    if (failed) this.notification.error(`${failed} invite${failed > 1 ? 's' : ''} failed.`);
                    this.closeCreateChatModal();
                  }
                }
              });
            });
          }
        });
      },
      error: () => {
        this.notification.error('Failed to create chat.');
        this.createChatCreating = false;
      },
    });
  }

  // ─── Chat settings ────────────────────────────────────────────────────────────

  chatSettingsSwal() {
    if (!this.selectedChat) return;
    const chat = this.selectedChat;

    Swal.fire({
      title: 'Chat Settings',
      html: `
        <input type="text" id="editName" class="swal2-input" placeholder="Chat Name" value="${chat.name}">
        <div style="text-align:left;margin:10px 16px;">
          <label><input type="checkbox" id="editHasPw" style="margin-right:6px;" ${chat.hasPassword ? 'checked' : ''}>Chat has password</label>
        </div>
        <input type="password" id="editPw" class="swal2-input" placeholder="New password" style="display:${chat.hasPassword ? 'block' : 'none'};">
      `,
      showCancelButton: true,
      confirmButtonText: 'Save',
      focusConfirm: false,
      didOpen: () => {
        const cb = document.getElementById('editHasPw') as HTMLInputElement;
        const pw = document.getElementById('editPw') as HTMLInputElement;
        cb.addEventListener('change', () => { pw.style.display = cb.checked ? 'block' : 'none'; });
      },
      preConfirm: () => {
        const name = (document.getElementById('editName') as HTMLInputElement).value.trim();
        const hasPassword = (document.getElementById('editHasPw') as HTMLInputElement).checked;
        const password = (document.getElementById('editPw') as HTMLInputElement).value;
        if (!name) { Swal.showValidationMessage('Chat name is required'); return false; }
        return { id: chat.id, name, hasPassword, password: hasPassword ? password : '' };
      },
    }).then(result => {
      if (!result.isConfirmed) return;
      this.chatService.UpdateChat(result.value).subscribe({
        next: updated => {
          this.selectedChat = updated;
          const chats = this.userChats$.value.map(c => c.id === updated.id ? updated : c);
          this.userChats$.next(chats);
          this.applyFilter();
          this.notification.success('Chat updated!');
        },
        error: () => this.notification.error('Failed to update chat.'),
      });
    });
  }

  // ─── Add-people panel (inside open chat) ─────────────────────────────────────

  openAddUserPanel() {
    if (!this.selectedChat) return;
    this.showAddUserPanel = true;
    this.addUserSearch = '';
    this.addUserResults = [];
    this.addUserSelected.clear();
  }

  closeAddUserPanel() {
    this.showAddUserPanel = false;
    this.addUserSearch = '';
    this.addUserResults = [];
    this.addUserSelected.clear();
    clearTimeout(this.addUserDebounce);
  }

  onAddUserSearch(event: Event) {
    this.addUserSearch = (event.target as HTMLInputElement).value;
    clearTimeout(this.addUserDebounce);
    const term = this.addUserSearch.trim();
    if (!term) { this.addUserResults = []; return; }

    this.addUserSearching = true;
    this.addUserDebounce = setTimeout(() => {
      this.userService.searchUserByName(term).subscribe({
        next: tokens => {
          if (!tokens.length) {
            this.addUserResults = [];
            this.addUserSearching = false;
            return;
          }
          forkJoin(tokens.map(t => this.userService.getUserById(t.id))).subscribe({
            next: users => {
              this.addUserResults = users;
              this.addUserSearching = false;
            },
            error: () => { this.addUserSearching = false; }
          });
        },
        error: () => { this.addUserSearching = false; }
      });
    }, 280);
  }

  toggleAddUserSelect(user: UserInterface) {
    if (this.addUserSelected.has(user.id)) {
      this.addUserSelected.delete(user.id);
    } else {
      this.addUserSelected.set(user.id, user);
    }
    this.addUserSelected = new Map(this.addUserSelected);
  }

  removeAddUserChip(userId: number) {
    this.addUserSelected.delete(userId);
    this.addUserSelected = new Map(this.addUserSelected);
  }

  get addUserSelectedList(): UserInterface[] {
    return Array.from(this.addUserSelected.values());
  }

  confirmAddUsers() {
    if (!this.selectedChat || !this.addUserSelected.size) return;
    this.addUserAdding = true;
    const chatId = this.selectedChat.id;
    const users = Array.from(this.addUserSelected.values());
    let done = 0;
    let failed = 0;

    users.forEach(user => {
      this.chatUserService.AddChatUser({ userId: user.id, chatId }).subscribe({
        next: () => {
          // Cache the new member locally so their name/avatar shows right away
          this.usersNameMap.set(user.id, user.name);
          this.usersImageMap.set(user.id, user.profileImageUrl ?? null);
          done++;
          if (done + failed === users.length) this.finishAddUsers(done, failed);
        },
        error: () => {
          failed++;
          if (done + failed === users.length) this.finishAddUsers(done, failed);
        }
      });
    });
  }

  private finishAddUsers(done: number, failed: number) {
    this.addUserAdding = false;
    if (done) this.notification.success(`${done} user${done > 1 ? 's' : ''} added!`);
    if (failed) this.notification.error(`${failed} user${failed > 1 ? 's' : ''} could not be added.`);
    this.closeAddUserPanel();
  }

  // ─── Leave chat ───────────────────────────────────────────────────────────────

  quitFromChatSwal(id: number) {
    Swal.fire({
      title: 'Quit chat?',
      text: "You won't be able to rejoin by yourself.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, quit',
    }).then(result => {
      if (!result.isConfirmed) return;

      // If we're leaving the currently open chat, clear it immediately
      if (id === this.selectedChat?.id) {
        this.selectedChat = null;
        this.selectedChatMessages$.next([]);
      }

      this.chatUserService.RemoveChatUser({ userId: this.tokenData.id, chatId: id }).subscribe({
        next: () => this.notification.success('You left the chat.'),
        error: () => this.notification.error('Something went wrong.'),
      });
    });
  }

  // ─── Mobile sidebar drawer ────────────────────────────────────────────────────

  openPanelMobile() {
    this.panelOpen = true;
  }

  closePanelMobile() {
    this.panelOpen = false;
  }

  // ─── Scroll helpers ───────────────────────────────────────────────────────────

  /** Listen to the messages container's scroll position and toggle the FAB */
  onMessagesScroll(event: Event) {
    const el = event.target as HTMLDivElement;
    // Show the button when the user has scrolled more than 150px from the bottom
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.showScrollToBottom = distanceFromBottom > 150;
  }

  /** Programmatically jump to the latest messages */
  public scrollToBottom() {
    setTimeout(() => {
      const container = this.messagesContainerRef?.nativeElement
        ?? document.querySelector('.chat-messages');
      if (container) {
        container.scrollTop = container.scrollHeight;
        this.showScrollToBottom = false;
      }
    }, 50);
  }
}