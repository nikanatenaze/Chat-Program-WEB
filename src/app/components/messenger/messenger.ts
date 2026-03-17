import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
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

// Animation duration constants (must match CSS)
const CLOSE_ANIM_MS = 210;  // panel / modal exit animation
const SWITCH_OUT_MS = 190;  // messages fade-out on chat switch

@Component({
  selector: 'app-messenger',
  templateUrl: './messenger.html',
  standalone: false,
  styleUrls: ['./messenger.css'],
})
export class Messenger implements OnInit, OnDestroy, AfterViewInit {

  // ─── Auth / user basics ──────────────────────────────────────────────────────
  public token: string = sessionStorage.getItem('token') ?? '';
  public tokenData!: TokenModelInterface;
  public userData!: UserInterface;

  // ─── Chat list streams ───────────────────────────────────────────────────────
  public userChats$ = new BehaviorSubject<ChatInterface[]>([]);
  public filteredChats$ = new BehaviorSubject<ChatInterface[]>([]);
  public selectedChatMessages$ = new BehaviorSubject<MessageInterface[]>([]);

  // ─── Search & compose ────────────────────────────────────────────────────────
  public searchTerm = '';
  public newMessage = '';

  // ─── Loading / in-flight flags ───────────────────────────────────────────────
  public chatLoading = false;
  public chatsLoading = true;
  public isSending = false;

  // ─── Inline message editing ──────────────────────────────────────────────────
  public editingMessageId: number | null = null;
  public editContent = '';
  public editClosingId: number | null = null;   // drives edit-bubble exit anim
  public deletingMessageId: number | null = null; // drives delete shrink-out anim
  public quitConfirmChatId: number | null = null; // custom quit confirm UI
  public quitConfirmClosing = false;              // drives quit card exit anim
  private editCloseTimer: any;
  private deleteAnimTimer: any;
  private quitCloseTimer: any;

  // ─── Add-people panel ────────────────────────────────────────────────────────
  public showAddUserPanel = false;
  public addUserPanelClosing = false;       // drives exit animation
  public addUserSearch = '';
  public addUserResults: UserInterface[] = [];
  public addUserSelected = new Map<number, UserInterface>();
  public addUserSearching = false;
  public addUserAdding = false;
  private addUserDebounce: any;

  // ─── Create chat modal ───────────────────────────────────────────────────────
  public showCreateChatModal = false;
  public createChatModalClosing = false;    // drives exit animation
  public createChatName = '';
  public createChatHasPassword = false;
  public createChatPassword = '';
  public createChatUserSearch = '';
  public createChatUserResults: UserInterface[] = [];
  public createChatSelected = new Map<number, UserInterface>();
  public createChatUserSearching = false;
  public createChatCreating = false;
  private createChatDebounce: any;

  // ─── Scroll-to-bottom FAB ────────────────────────────────────────────────────
  public showScrollToBottom = false;
  public fabClosing = false;
  private fabCloseTimer: any;
  @ViewChild('messagesContainer') messagesContainerRef!: ElementRef<HTMLDivElement>;

  // ─── Stars canvas ────────────────────────────────────────────────────────────
  @ViewChild('starsCanvas') starsCanvasRef!: ElementRef<HTMLCanvasElement>;
  private starsAnimFrame: number = 0;

  // ─── Mobile sidebar ──────────────────────────────────────────────────────────
  public panelOpen = false;
  public panelClosing = false;              // drives exit animation

  // ─── Active chat ─────────────────────────────────────────────────────────────
  public selectedChat: ChatInterface | null = null;

  // ─── Chat-switch animation ───────────────────────────────────────────────────
  // 'idle' = normal | 'out' = fading out before load
  public chatTransition: 'idle' | 'out' = 'idle';
  private switchPending = false;
  // Getter so existing template binding still works
  public get chatSwitchingOut(): boolean { return this.chatTransition === 'out'; }

  // ─── New message animation ───────────────────────────────────────────────────
  // ID of the most-recently-received/sent message — drives the pop-in CSS class.
  // Cleared after the animation duration so the class doesn't stick.
  public latestMessageId: number | null = null;
  private latestMsgTimer: any;

  // ─── Avatar / name caches ────────────────────────────────────────────────────
  private usersImageMap = new Map<number, string | null>();
  private usersNameMap = new Map<number, string>();

  // ─── Chat list skeleton widths (randomised once) ─────────────────────────────
  public chatSkelWidths = ['72%', '55%', '88%', '64%', '76%', '50%'];
  public chatSkelSubWidths = ['48%', '60%', '38%', '52%', '44%', '58%'];

  // ─── Receive sound ───────────────────────────────────────────────────────────
  private receiveAudio = new Audio('message-recive-sound.mp3');

  constructor(
    public hub: MainHubService,
    public userService: User,
    public chatUserService: ChatUserService,
    public chatService: ChatService,
    public messageService: MessageService,
    public notification: NotificationService
  ) { }

  // ═══════════════════════════════════════════════════════════════════════════
  // Lifecycle
  // ═══════════════════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.userService.getDataFromToken().subscribe(x => {
      this.tokenData = x;
      this.build();
    });
  }

  ngAfterViewInit(): void {
    this.initStars();
  }

  ngOnDestroy(): void {
    if (this.starsAnimFrame) cancelAnimationFrame(this.starsAnimFrame);
    clearTimeout(this.latestMsgTimer);
    clearTimeout(this.fabCloseTimer);
    clearTimeout(this.editCloseTimer);
    clearTimeout(this.deleteAnimTimer);
    clearTimeout(this.quitCloseTimer);
    this.hub.stopConnection()
      .then(() => console.log('SignalR disconnected'))
      .catch(err => console.error('SignalR disconnect error:', err));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Stars background
  // ═══════════════════════════════════════════════════════════════════════════

  private initStars(): void {
    const canvas = this.starsCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    interface Star {
      x: number; y: number;
      r: number; opacity: number;
      speed: number; twinkleSpeed: number; twinkleOffset: number;
    }

    const STAR_COUNT = 160;
    let stars: Star[] = [];
    let W = 0, H = 0;

    const resize = () => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };

    const seed = () => {
      stars = Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.2 + 0.2,
        opacity: Math.random() * 0.5 + 0.15,
        speed: Math.random() * 0.012 + 0.003,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinkleOffset: Math.random() * Math.PI * 2,
      }));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        const twinkle = Math.sin(t * s.twinkleSpeed + s.twinkleOffset) * 0.25;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, s.opacity + twinkle)})`;
        ctx.fill();
        s.y -= s.speed;
        if (s.y + s.r < 0) { s.y = H + s.r; s.x = Math.random() * W; }
      }
      this.starsAnimFrame = requestAnimationFrame(draw);
    };

    resize();
    seed();
    new ResizeObserver(() => { resize(); seed(); }).observe(canvas);
    this.starsAnimFrame = requestAnimationFrame(draw);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Startup
  // ═══════════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════════
  // SignalR
  // ═══════════════════════════════════════════════════════════════════════════

  private async connectSignalR() {
    await this.hub.startConnection(this.token);
    await this.hub.joinChatUsers(this.userData.id);

    this.hub.onAddUser(data => {
      const updated = [...this.userChats$.value, data].sort((a, b) => a.id - b.id);
      this.userChats$.next(updated);
      this.applyFilter();
      this.notification.success(`You were added to "${data.name}"!`);
    });

    this.hub.onRemoveUser(data => {
      this.userChats$.next(this.userChats$.value.filter(x => x.id !== data.id));
      this.applyFilter();
    });

    this.hub.onCreateMessage(data => {
      const mapped = this.mapMessage(data);
      this.selectedChatMessages$.next([...this.selectedChatMessages$.value, mapped]);
      if (!mapped.isWriter) {
        this.receiveAudio.currentTime = 0;
        this.receiveAudio.volume = 0.4;
        this.receiveAudio.play().catch(() => { });
      }
      // Trigger the new-message pop-in animation
      this._flashLatestMessage(mapped.id);
      this.scrollToBottom(true);
    });

    this.hub.onDeleteMessage(data => {
      this.selectedChatMessages$.next(
        this.selectedChatMessages$.value.filter(m => m.id !== data.id)
      );
    });

    this.hub.onEditMessage(data => {
      const updated = this.selectedChatMessages$.value.map(m =>
        m.id === data.id ? { ...m, content: data.content } : m
      );
      this.selectedChatMessages$.next(updated);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Chat selection — with switch animation
  // ═══════════════════════════════════════════════════════════════════════════

  public selectChat(id: number) {
    if (this.switchPending) return;

    this.closeAddUserPanel();
    this.closePanelMobile();

    // If content is visible, play out-animation first, then load
    const hasContent = (this.selectedChatMessages$.value.length > 0 || this.selectedChat) && !this.chatLoading;

    if (hasContent) {
      this.switchPending = true;
      this.chatTransition = 'out';
      setTimeout(() => {
        this.switchPending = false;
        this._loadChat(id);
      }, SWITCH_OUT_MS);
    } else {
      this._loadChat(id);
    }
  }

  private _loadChat(id: number) {
    // Reset to idle so the wrapper isn't animated while the skeleton shows
    this.chatTransition = 'idle';
    this.chatLoading = true;
    this.selectedChat = null;
    this.selectedChatMessages$.next([]);
    this.usersImageMap.clear();
    this.usersNameMap.clear();

    this.chatService.GetChatById(id).subscribe(chat => {
      this.selectedChat = chat;
      this.hub.leaveChat(chat.id);
      this.hub.joinChat(chat.id);

      this.chatUserService.GetUsersInChat(chat.id).subscribe(users => {
        users.forEach(u => {
          this.usersImageMap.set(u.id, u.profileImageUrl ?? null);
          this.usersNameMap.set(u.id, u.name);
        });

        this.chatService.GetChatMessages(chat.id).subscribe(messages => {
          this.selectedChatMessages$.next(messages.map(x => this.mapMessage(x)));
          this.chatLoading = false;

          this.scrollToBottom(true);
        });
      });
    });
  }

  private mapMessage(data: MessageInterface): MessageInterface {
    return {
      ...data,
      createdAt: GlobalMethods.formatDate(data.createdAt, false, true),
      isWriter: data.userId === this.userData?.id,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Message display helpers
  // ═══════════════════════════════════════════════════════════════════════════

  shouldShowSender(messages: MessageInterface[], index: number): boolean {
    const current = messages[index];
    if (current.isWriter) return false;
    if (index === 0) return true;
    return messages[index - 1].userId !== current.userId;
  }

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
    this.userService.getUserById(message.userId).subscribe(u => {
      this.usersNameMap.set(u.id, u.name);
      this.usersImageMap.set(u.id, u.profileImageUrl ?? null);
      this.selectedChatMessages$.next([...this.selectedChatMessages$.value]);
    });
    return '…';
  }

  getInitial(message: MessageInterface): string {
    return this.getUserName(message).charAt(0).toUpperCase();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Chat list search
  // ═══════════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════════
  // Sending messages
  // ═══════════════════════════════════════════════════════════════════════════

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
      next: () => { this.newMessage = ''; this.isSending = false; },
      error: err => { console.error(err); this.isSending = false; },
    });

    this.scrollToBottom();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Inline editing
  // ═══════════════════════════════════════════════════════════════════════════

  public startEdit(message: MessageInterface) {
    this.editingMessageId = message.id;
    this.editContent = message.content;
    setTimeout(() => {
      const el = document.getElementById(`edit-input-${message.id}`) as HTMLTextAreaElement;
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 30);
  }

  public cancelEdit() {
    if (this.editingMessageId === null) return;
    this.editClosingId = this.editingMessageId;
    clearTimeout(this.editCloseTimer);
    this.editCloseTimer = setTimeout(() => {
      this.editingMessageId = null;
      this.editClosingId = null;
      this.editContent = '';
    }, 200);
  }

  public saveEdit(messageId: number) {
    const content = this.editContent.trim();
    if (!content) return;
    this.messageService.EditMessage({ id: messageId, content, userId: this.tokenData.id }).subscribe({
      next: updated => {
        // Play close animation first, then swap the content in
        this.editClosingId = messageId;
        clearTimeout(this.editCloseTimer);
        this.editCloseTimer = setTimeout(() => {
          const msgs = this.selectedChatMessages$.value.map(m =>
            m.id === messageId ? { ...m, content: updated.content } : m
          );
          this.selectedChatMessages$.next(msgs);
          this.editingMessageId = null;
          this.editClosingId = null;
          this.editContent = '';
        }, 200);
      },
      error: () => this.notification.error('Failed to edit message.'),
    });
  }

  public deleteMessage(messageId: number) {
    // Animate the bubble out, then fire the API
    this.deletingMessageId = messageId;
    clearTimeout(this.deleteAnimTimer);
    this.deleteAnimTimer = setTimeout(() => {
      this.messageService.DeleteMessage(messageId).subscribe({
        next: () => {
          this.deletingMessageId = null;
        },
        error: () => {
          this.deletingMessageId = null;
          this.notification.error('Failed to delete message.');
        },
      });
    }, 280);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Create chat modal — with close animation
  // ═══════════════════════════════════════════════════════════════════════════

  openCreateChatModal() {
    this.createChatModalClosing = false;
    this.showCreateChatModal = true;
    this.createChatName = '';
    this.createChatHasPassword = false;
    this.createChatPassword = '';
    this.createChatUserSearch = '';
    this.createChatUserResults = [];
    this.createChatSelected.clear();
  }

  closeCreateChatModal() {
    if (this.createChatModalClosing) return;
    this.createChatModalClosing = true;
    clearTimeout(this.createChatDebounce);
    setTimeout(() => {
      this.showCreateChatModal = false;
      this.createChatModalClosing = false;
    }, CLOSE_ANIM_MS);
  }

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
        const updated = [...this.userChats$.value, newChat].sort((a, b) => a.id - b.id);
        this.userChats$.next(updated);
        this.applyFilter();

        const invitees = Array.from(this.createChatSelected.values());
        if (!invitees.length) {
          this.createChatCreating = false;
          this.closeCreateChatModal();
          return;
        }

        let done = 0, failed = 0;
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
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Chat settings
  // ═══════════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════════
  // Add-people panel — with close animation
  // ═══════════════════════════════════════════════════════════════════════════

  openAddUserPanel() {
    if (!this.selectedChat) return;
    this.addUserPanelClosing = false;
    this.showAddUserPanel = true;
    this.addUserSearch = '';
    this.addUserResults = [];
    this.addUserSelected.clear();
  }

  closeAddUserPanel() {
    if (!this.showAddUserPanel || this.addUserPanelClosing) return;
    this.addUserPanelClosing = true;
    clearTimeout(this.addUserDebounce);
    setTimeout(() => {
      this.showAddUserPanel = false;
      this.addUserPanelClosing = false;
      this.addUserSearch = '';
      this.addUserResults = [];
      this.addUserSelected.clear();
    }, CLOSE_ANIM_MS);
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
            next: users => { this.addUserResults = users; this.addUserSearching = false; },
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
    let done = 0, failed = 0;

    users.forEach(user => {
      this.chatUserService.AddChatUser({ userId: user.id, chatId }).subscribe({
        next: () => {
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

  // ═══════════════════════════════════════════════════════════════════════════
  // Leave chat
  // ═══════════════════════════════════════════════════════════════════════════

  openQuitConfirm(id: number) {
    this.quitConfirmClosing = false;
    this.quitConfirmChatId = id;
  }

  closeQuitConfirm() {
    if (this.quitConfirmClosing) return;
    this.quitConfirmClosing = true;
    clearTimeout(this.quitCloseTimer);
    this.quitCloseTimer = setTimeout(() => {
      this.quitConfirmChatId = null;
      this.quitConfirmClosing = false;
    }, 200);
  }

  confirmQuit() {
    const id = this.quitConfirmChatId;
    if (id === null) return;
    this.closeQuitConfirm();
    // Small delay so the card animates out before action fires
    setTimeout(() => {
      if (id === this.selectedChat?.id) {
        this.selectedChat = null;
        this.selectedChatMessages$.next([]);
      }
      this.chatUserService.RemoveChatUser({ userId: this.tokenData.id, chatId: id }).subscribe({
        next: () => this.notification.success('You left the chat.'),
        error: () => this.notification.error('Something went wrong.'),
      });
    }, 220);
  }

  // Keep old name so HTML template still compiles — just delegates
  quitFromChatSwal(id: number) {
    this.openQuitConfirm(id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Mobile sidebar — with close animation
  // ═══════════════════════════════════════════════════════════════════════════

  openPanelMobile() {
    this.panelClosing = false;
    this.panelOpen = true;
  }

  closePanelMobile() {
    if (!this.panelOpen || this.panelClosing) return;
    this.panelClosing = true;
    setTimeout(() => {
      this.panelOpen = false;
      this.panelClosing = false;
    }, CLOSE_ANIM_MS);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // New-message animation helper
  // ═══════════════════════════════════════════════════════════════════════════

  private _flashLatestMessage(id: number) {
    clearTimeout(this.latestMsgTimer);
    this.latestMessageId = id;
    // CSS animation is 320ms max — clear after to avoid the class persisting
    // if the user scrolls back up and the element re-enters the DOM
    this.latestMsgTimer = setTimeout(() => {
      this.latestMessageId = null;
    }, 400);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Scroll helpers
  // ═══════════════════════════════════════════════════════════════════════════

  onMessagesScroll(event: Event) {
    const el = event.target as HTMLDivElement;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const shouldShow = distanceFromBottom > 150;

    if (!shouldShow && this.showScrollToBottom && !this.fabClosing) {
      // User scrolled close to bottom — play exit animation before removing FAB
      this.fabClosing = true;
      clearTimeout(this.fabCloseTimer);
      this.fabCloseTimer = setTimeout(() => {
        this.showScrollToBottom = false;
        this.fabClosing = false;
      }, 190);
    } else if (shouldShow && !this.showScrollToBottom) {
      this.fabClosing = false;
      clearTimeout(this.fabCloseTimer);
      this.showScrollToBottom = true;
    }
  }

  public scrollToBottom(instant = false) {
    setTimeout(() => {
      const container = this.messagesContainerRef?.nativeElement
        ?? document.querySelector('.chat-messages') as HTMLElement;
      if (!container) return;

      if (instant) {
        container.scrollTop = container.scrollHeight;
        this.showScrollToBottom = false;
        this.fabClosing = false;
      } else {
        // Smooth animated scroll
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        // Trigger FAB exit animation then hide
        if (this.showScrollToBottom && !this.fabClosing) {
          this.fabClosing = true;
          clearTimeout(this.fabCloseTimer);
          this.fabCloseTimer = setTimeout(() => {
            this.showScrollToBottom = false;
            this.fabClosing = false;
          }, 190);
        }
      }
    }, 50);
  }
}