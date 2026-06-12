import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
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
import { GlobalMethods } from '../../classes/global-methods';

// How long exit animations take — keep these in sync with the CSS keyframe durations.
const CLOSE_ANIM_MS = 210;   // panel / modal slide-out
const SWITCH_OUT_MS = 190;   // messages fade when switching chats
const CS_CLOSE_MS = 240;   // settings panel slide-out

@Component({
  selector: 'app-messenger',
  templateUrl: './messenger.html',
  standalone: false,
  styleUrls: ['./messenger.css'],
})
export class Messenger implements OnInit, OnDestroy, AfterViewInit {

  // ── Auth ─────────────────────────────────────────────────────────────────────
  public token: string = sessionStorage.getItem('token') ?? '';
  public tokenData!: TokenModelInterface;
  public userData!: UserInterface;

  // ── Chat list streams ────────────────────────────────────────────────────────
  public userChats$ = new BehaviorSubject<ChatInterface[]>([]);
  public filteredChats$ = new BehaviorSubject<ChatInterface[]>([]);
  public selectedChatMessages$ = new BehaviorSubject<MessageInterface[]>([]);

  // ── Search & compose ─────────────────────────────────────────────────────────
  public searchTerm = '';
  public newMessage = '';

  // ── Loading / sending flags ───────────────────────────────────────────────────
  public chatLoading = false;
  public chatsLoading = true;
  public isSending = false;

  // ── Inline message editing ───────────────────────────────────────────────────
  public editingMessageId: number | null = null;
  public editContent = '';
  public editClosingId: number | null = null;
  public deletingMessageId: number | null = null;
  public quitConfirmChatId: number | null = null;
  public quitConfirmClosing = false;
  private editCloseTimer: any;
  private deleteAnimTimer: any;
  private quitCloseTimer: any;

  // ── Add-people panel ──────────────────────────────────────────────────────────
  public showAddUserPanel = false;
  public addUserPanelClosing = false;
  public addUserSearch = '';
  public addUserResults: UserInterface[] = [];
  public addUserSelected = new Map<number, UserInterface>();
  public addUserSearching = false;
  public addUserAdding = false;
  private addUserDebounce: any;

  // ── Create chat modal ─────────────────────────────────────────────────────────
  public showCreateChatModal = false;
  public createChatModalClosing = false;
  public createChatName = '';
  public createChatHasPassword = false;
  public createChatPassword = '';
  public createChatUserSearch = '';
  public createChatUserResults: UserInterface[] = [];
  public createChatSelected = new Map<number, UserInterface>();
  public createChatUserSearching = false;
  public createChatCreating = false;
  private createChatDebounce: any;

  // ── Scroll-to-bottom FAB ─────────────────────────────────────────────────────
  public showScrollToBottom = false;
  public fabClosing = false;
  private fabCloseTimer: any;
  @ViewChild('messagesContainer') messagesContainerRef!: ElementRef<HTMLDivElement>;

  // ── Stars canvas ─────────────────────────────────────────────────────────────
  @ViewChild('starsCanvas') starsCanvasRef!: ElementRef<HTMLCanvasElement>;
  private starsAnimFrame: number = 0;

  // ── Mobile sidebar ────────────────────────────────────────────────────────────
  public panelOpen = false;
  public panelClosing = false;

  // ── Active chat ───────────────────────────────────────────────────────────────
  public selectedChat: ChatInterface | null = null;

  // ── Chat-switch animation state ───────────────────────────────────────────────
  public chatTransition: 'idle' | 'out' = 'idle';
  private switchPending = false;
  public get chatSwitchingOut(): boolean { return this.chatTransition === 'out'; }

  // ── Skeleton → real messages crossfade ───────────────────────────────────────
  public skelExiting = false;
  public messagesRevealing = false;

  // ── New message pop animation ─────────────────────────────────────────────────
  public latestMessageId: number | null = null;
  private latestMsgTimer: any;

  // ── Avatar / display-name caches (keyed by userId) ───────────────────────────
  private usersImageMap = new Map<number, string | null>();
  private usersNameMap = new Map<number, string>();

  // ── Skeleton placeholder widths (randomised at design time) ──────────────────
  public chatSkelWidths = ['72%', '55%', '88%', '64%', '76%', '50%'];
  public chatSkelSubWidths = ['48%', '60%', '38%', '52%', '44%', '58%'];

  // ── Incoming message sound ────────────────────────────────────────────────────
  private receiveAudio = new Audio('message-recive-sound.mp3');

  // ══════════════════════════════════════════════════════════════════════════════
  // CHAT SETTINGS STATE
  // ══════════════════════════════════════════════════════════════════════════════

  // Open / close flags
  public showChatSettings = false;
  public chatSettingsClosing = false;
  /**
   * chatSettingsVisible is the *ngIf guard for the panel DOM node.
   * Toggling it off for a single tick forces Angular to destroy and
   * recreate the element, which means the CSS open animation always
   * fires from scratch — even when you close and immediately re-open.
   */
  public chatSettingsVisible = false;
  private csCloseTimer: any;
  private csReopenTimer: any;

  // Members list loaded from the server
  public csMembers: UserInterface[] = [];
  public csLoading = false;

  // Form state for the General tab
  public csChatName = '';
  public csHasPassword = false;
  public csPassword = '';
  public csConfirmPassword = '';
  public csActiveTab: 'general' | 'members' = 'general';

  // Avatar image state
  public csImagePreview: string | null = null;
  public csImageLoading = false;   // spinner in the header avatar
  public csUploadImageLoading = false;   // spinner while uploading a new photo
  public csUploadPreviewLoading = false;   // skeleton while the uploaded image loads
  private csPreviousImageUrl: string | null = null;  // lets us restore on upload error

  // Save / delete in-flight flags
  public csSaving = false;
  public csDeleting = false;

  // Alert messages (cleared by a timer or manually)
  public csSuccessMessage = '';
  public csErrorMessage = '';
  private csSuccessTimer: any;

  // Delete-chat confirmation dialog
  public csShowDeleteConfirm = false;
  public csDeleteConfirmClosing = false;
  private csDeleteCloseTimer: any;

  // Kick-member confirmation dialog
  public csKickTargetUser: UserInterface | null = null;
  public csKickConfirmClosing = false;
  public csKickingUserId: number | null = null;
  private csKickCloseTimer: any;

  // Tracks which member avatars have finished loading (so we can hide the skeleton)
  public csMemberImagesLoaded = new Set<number>();

  // True if the current user created this chat
  public get csIsOwner(): boolean {
    return this.tokenData?.id === this.selectedChat?.createdByUserId;
  }

  // Inline validation: only show the mismatch error once the confirm field has content
  public get csPasswordsMatch(): boolean {
    return !this.csConfirmPassword || this.csPassword === this.csConfirmPassword;
  }

  constructor(
    public hub: MainHubService,
    public userService: User,
    public chatUserService: ChatUserService,
    public chatService: ChatService,
    public messageService: MessageService,
    public notification: NotificationService,
    private router: Router
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
    // Kill the canvas loop so we're not leaking rAF callbacks
    if (this.starsAnimFrame) cancelAnimationFrame(this.starsAnimFrame);

    // Clear all pending timeouts
    clearTimeout(this.latestMsgTimer);
    clearTimeout(this.fabCloseTimer);
    clearTimeout(this.editCloseTimer);
    clearTimeout(this.deleteAnimTimer);
    clearTimeout(this.quitCloseTimer);
    clearTimeout(this.csCloseTimer);
    clearTimeout(this.csReopenTimer);
    clearTimeout(this.csSuccessTimer);
    clearTimeout(this.csDeleteCloseTimer);
    clearTimeout(this.csKickCloseTimer);

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
        // Slowly drift stars upward; wrap back to the bottom when they leave the top
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
  // SignalR real-time handlers
  // ═══════════════════════════════════════════════════════════════════════════

  private async connectSignalR() {
    await this.hub.startConnection(this.token);
    await this.hub.joinChatUsers(this.userData.id);

    // Someone added us to a new chat
    this.hub.onAddUser(data => {
      const updated = [...this.userChats$.value, data].sort((a, b) => a.id - b.id);
      this.userChats$.next(updated);
      this.applyFilter();
      this.notification.success(`You were added to "${data.name}"!`);
    });

    // We were kicked or left — remove from sidebar and clear the chat area if it was active
    this.hub.onRemoveUser(data => {
      this.userChats$.next(this.userChats$.value.filter(x => x.id !== data.id));
      this.applyFilter();

      if (this.selectedChat?.id === data.id) {
        // Let the settings panel finish its slide-out before wiping the chat area
        if (this.showChatSettings && !this.chatSettingsClosing) {
          this.closeChatSettings();
        }
        setTimeout(() => {
          this.selectedChat = null;
          this.selectedChatMessages$.next([]);
          this.chatLoading = false;
        }, CS_CLOSE_MS);

        this.notification.error(`You were removed from "${data.name}".`);
      }
    });

    // New message arrived
    this.hub.onCreateMessage(data => {
      const mapped = this.mapMessage(data);
      this.selectedChatMessages$.next([...this.selectedChatMessages$.value, mapped]);

      // Only play the receive sound for messages from others
      if (!mapped.isWriter) {
        this.receiveAudio.currentTime = 0;
        this.receiveAudio.volume = 0.4;
        this.receiveAudio.play().catch(() => { });
      }

      this._flashLatestMessage(mapped.id);
      this.scrollToBottom(true);
    });

    // A message was deleted by its author
    this.hub.onDeleteMessage(data => {
      this.selectedChatMessages$.next(
        this.selectedChatMessages$.value.filter(m => m.id !== data.id)
      );
    });

    // A message was edited
    this.hub.onEditMessage(data => {
      const updated = this.selectedChatMessages$.value.map(m =>
        m.id === data.id ? { ...m, content: data.content } : m
      );
      this.selectedChatMessages$.next(updated);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Chat selection — plays a fade-out before switching
  // ═══════════════════════════════════════════════════════════════════════════

  public selectChat(id: number) {
    // Ignore rapid taps while a switch is already in progress
    if (this.switchPending) return;

    this.closeAddUserPanel();
    this.closePanelMobile();

    if (this.showChatSettings) {
      this.closeChatSettings();
    }

    // Only play the exit animation when there's something visible to cross-fade
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
    this.chatTransition = 'idle';
    this.chatLoading = true;
    this.selectedChat = null;
    this.selectedChatMessages$.next([]);
    this.usersImageMap.clear();
    this.usersNameMap.clear();

    this.chatService.GetChatById(id).subscribe(chat => {
      this.selectedChat = chat;
      // Leave the old SignalR room before joining the new one
      this.hub.leaveChat(chat.id);
      this.hub.joinChat(chat.id);

      this.chatUserService.GetUsersInChat(chat.id).subscribe(users => {
        // Pre-populate the avatar / name caches so messages render immediately
        users.forEach(u => {
          this.usersImageMap.set(u.id, u.profileImageUrl ?? null);
          this.usersNameMap.set(u.id, u.name);
        });

        this.chatService.GetChatMessages(chat.id).subscribe(messages => {
          this.selectedChatMessages$.next(messages.map(x => this.mapMessage(x)));

          // Step 1: fade the skeleton out
          this.skelExiting = true;
          setTimeout(() => {
            // Step 2: swap in real messages and play the reveal animation
            this.chatLoading = false;
            this.skelExiting = false;
            this.messagesRevealing = true;
            this.scrollToBottom(true);
            setTimeout(() => { this.messagesRevealing = false; }, 420);
          }, 260);
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
    // Only show the avatar on the last bubble in a consecutive run from this user
    return !next || next.userId !== current.userId;
  }

  getUserAvatar(userId: number): string | null {
    return this.usersImageMap.get(userId) ?? null;
  }

  getUserName(message: MessageInterface): string {
    const fromMap = this.usersNameMap.get(message.userId);
    if (fromMap) return fromMap;
    if (message.userName) return message.userName;

    // User not in cache yet — fetch lazily and trigger a re-render
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

  getSettingsInitial(name: string): string {
    return (name || '?').charAt(0).toUpperCase();
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
  // Inline message editing
  // ═══════════════════════════════════════════════════════════════════════════

  public startEdit(message: MessageInterface) {
    this.editingMessageId = message.id;
    this.editContent = message.content;
    // Focus and place cursor at the end of the textarea
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
        // Play the close animation before swapping the content in
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
    this.deletingMessageId = messageId;
    clearTimeout(this.deleteAnimTimer);
    // Let the collapse animation finish before actually removing it from the server
    this.deleteAnimTimer = setTimeout(() => {
      this.messageService.DeleteMessage(messageId).subscribe({
        next: () => { this.deletingMessageId = null; },
        error: () => {
          this.deletingMessageId = null;
          this.notification.error('Failed to delete message.');
        },
      });
    }, 280);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Create chat modal
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
          forkJoin(tokens.map((t: any) => this.userService.getUserById(t.id))).subscribe({
            next: (users: any) => {
              // Don't show ourselves in the results
              this.createChatUserResults = users.filter((u: any) => u.id !== this.userData.id);
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
    // Recreate the Map so Angular's change detection picks up the mutation
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
  // Add-people panel
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
        next: (tokens: any) => {
          if (!tokens.length) {
            this.addUserResults = [];
            this.addUserSearching = false;
            return;
          }
          forkJoin(tokens.map((t: any) => this.userService.getUserById(t.id))).subscribe({
            next: (users: any) => { this.addUserResults = users; this.addUserSearching = false; },
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
          // Keep the local avatar/name caches and settings member list in sync
          this.usersNameMap.set(user.id, user.name);
          this.usersImageMap.set(user.id, user.profileImageUrl ?? null);
          if (this.showChatSettings) {
            this.csMembers = [...this.csMembers, user];
          }
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
    setTimeout(() => {
      if (id === this.selectedChat?.id) {
        this.selectedChat = null;
        this.selectedChatMessages$.next([]);
        this.closeChatSettings();
      }
      this.chatUserService.RemoveChatUser({ userId: this.tokenData.id, chatId: id }).subscribe({
        next: () => this.notification.success('You left the chat.'),
        error: () => this.notification.error('Something went wrong.'),
      });
    }, 220);
  }

  // Alias kept for any template calls using the old name
  quitFromChatSwal(id: number) { this.openQuitConfirm(id); }

  // ═══════════════════════════════════════════════════════════════════════════
  // Mobile sidebar
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
  // New-message animation
  // ═══════════════════════════════════════════════════════════════════════════

  private _flashLatestMessage(id: number) {
    clearTimeout(this.latestMsgTimer);
    this.latestMessageId = id;
    // Remove the class after the animation finishes so it can re-trigger next time
    this.latestMsgTimer = setTimeout(() => { this.latestMessageId = null; }, 400);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Scroll helpers
  // ═══════════════════════════════════════════════════════════════════════════

  onMessagesScroll(event: Event) {
    const el = event.target as HTMLDivElement;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const shouldShow = distanceFromBottom > 150;

    if (!shouldShow && this.showScrollToBottom && !this.fabClosing) {
      // Play the pop-out animation before hiding the button
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
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        // Hide the FAB as we scroll to the bottom
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

  // ══════════════════════════════════════════════════════════════════════════════
  // CHAT SETTINGS — panel open / close
  // ══════════════════════════════════════════════════════════════════════════════

  openChatSettings(): void {
    if (!this.selectedChat) return;

    // Clicking the gear again while the panel is open → close it
    if (this.showChatSettings && !this.chatSettingsClosing) {
      this.closeChatSettings();
      return;
    }

    /*
      Edge case: the user hit close and then immediately re-opened before
      the slide-out finished. We cancel the pending close, destroy the DOM
      node for one tick (so the open animation replays cleanly), then re-open.
    */
    if (this.chatSettingsClosing) {
      clearTimeout(this.csCloseTimer);
      clearTimeout(this.csReopenTimer);
      this.showChatSettings = false;
      this.chatSettingsClosing = false;
      this.chatSettingsVisible = false;

      this.csReopenTimer = setTimeout(() => this._initChatSettings(), 16);
      return;
    }

    this._initChatSettings();
  }

  /**
   * Sets up form state and makes the panel visible.
   * Kept separate so the re-open path can call it too.
   *
   * We use chatSettingsVisible (not showChatSettings) as the *ngIf guard
   * because toggling it off destroys the DOM node, which lets the CSS
   * @keyframes fire from the very first frame on every open — no re-trigger hacks needed.
   */
  private _initChatSettings(): void {
    this.csActiveTab = 'general';
    this.csClearMessages();
    this.csPassword = '';
    this.csConfirmPassword = '';
    this.csMemberImagesLoaded = new Set<number>();

    // Pre-fill the form with the current chat's values
    this.csChatName = this.selectedChat!.name;
    this.csHasPassword = this.selectedChat!.hasPassword;
    this.csImagePreview = this.selectedChat!.chatImageUrl ?? null;
    this.csPreviousImageUrl = this.csImagePreview;
    this.csImageLoading = !!this.csImagePreview;

    // Flip the flags — Angular recreates the DOM here, so the slide-in fires cleanly
    this.showChatSettings = true;
    this.chatSettingsClosing = false;
    this.chatSettingsVisible = true;

    // Fetch the member list asynchronously
    this.csLoading = true;
    this.chatUserService.GetUsersInChat(this.selectedChat!.id).subscribe({
      next: members => {
        this.csMembers = members;
        this.csLoading = false;
      },
      error: () => {
        this.csErrorMessage = 'Failed to load members.';
        this.csLoading = false;
      }
    });
  }

  closeChatSettings(): void {
    if (this.chatSettingsClosing) return;
    this.chatSettingsClosing = true;
    clearTimeout(this.csCloseTimer);
    this.csCloseTimer = setTimeout(() => {
      this.showChatSettings = false;
      this.chatSettingsClosing = false;
      this.chatSettingsVisible = false;
    }, CS_CLOSE_MS);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CHAT SETTINGS — tabs
  // ══════════════════════════════════════════════════════════════════════════════

  csSetTab(tab: 'general' | 'members'): void {
    this.csActiveTab = tab;
    this.csClearMessages();
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CHAT SETTINGS — image upload
  // ══════════════════════════════════════════════════════════════════════════════

  csOnImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];

    const previousImage = this.csImagePreview;

    // Show loading states while the upload is in flight
    this.csUploadImageLoading = true;
    this.csUploadPreviewLoading = true;
    this.csImageLoading = true;
    this.csImagePreview = null;

    this.chatService.uploadChatImage(this.selectedChat!.id, file).subscribe({
      next: res => {
        const newUrl = res.ImageUrl;

        this.csImagePreview = newUrl;
        this.csUploadImageLoading = false;
        this.csUploadPreviewLoading = true;  // skeleton stays until the img onload fires
        this.csImageLoading = true;

        // Keep the sidebar avatar and header in sync
        if (this.selectedChat) {
          this.selectedChat = { ...this.selectedChat, chatImageUrl: newUrl };
          const chats = this.userChats$.value.map(c =>
            c.id === this.selectedChat!.id ? { ...c, chatImageUrl: newUrl } : c
          );
          this.userChats$.next(chats);
          this.applyFilter();
        }

        this.csPreviousImageUrl = newUrl;
        this.csShowSuccess('Chat image updated!');
      },
      error: () => {
        // Restore the previous image on failure
        this.csImagePreview = previousImage;
        this.csUploadImageLoading = false;
        this.csUploadPreviewLoading = !!previousImage;
        this.csImageLoading = !!previousImage;
        this.csShowError('Failed to upload image. Please try again.');
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CHAT SETTINGS — save general settings
  // ══════════════════════════════════════════════════════════════════════════════

  csOnTogglePassword(): void {
    this.csHasPassword = !this.csHasPassword;
    if (!this.csHasPassword) { this.csPassword = ''; this.csConfirmPassword = ''; }
  }

  csOnSaveChanges(): void {
    this.csClearMessages();
    if (!this.csChatName.trim()) { this.csShowError('Chat name cannot be empty.'); return; }
    if (this.csHasPassword && this.csPassword !== this.csConfirmPassword) {
      this.csShowError('Passwords do not match.');
      return;
    }

    this.csSaving = true;
    this.chatService.UpdateChat({
      id: this.selectedChat!.id,
      name: this.csChatName.trim(),
      hasPassword: this.csHasPassword,
      password: this.csPassword
    }).subscribe({
      next: updated => {
        // Push the updated chat into the sidebar list too
        this.selectedChat = updated;
        const chats = this.userChats$.value.map(c => c.id === updated.id ? updated : c);
        this.userChats$.next(chats);
        this.applyFilter();
        this.csShowSuccess('Settings saved!');
        this.csSaving = false;
      },
      error: () => {
        this.csShowError('Failed to save settings.');
        this.csSaving = false;
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CHAT SETTINGS — delete chat
  // ══════════════════════════════════════════════════════════════════════════════

  csOpenDeleteConfirm(): void {
    this.csShowDeleteConfirm = true;
    this.csDeleteConfirmClosing = false;
  }

  csCloseDeleteConfirm(): void {
    if (this.csDeleteConfirmClosing) return;
    this.csDeleteConfirmClosing = true;
    clearTimeout(this.csDeleteCloseTimer);
    this.csDeleteCloseTimer = setTimeout(() => {
      this.csShowDeleteConfirm = false;
      this.csDeleteConfirmClosing = false;
    }, CLOSE_ANIM_MS);
  }

  csOnDeleteChat(): void {
    if (!this.selectedChat) return;
    this.csDeleting = true;
    this.chatService.DeleteChat(this.selectedChat.id).subscribe({
      next: () => {
        // Remove the chat from the sidebar and clear the active chat view
        this.userChats$.next(this.userChats$.value.filter(c => c.id !== this.selectedChat!.id));
        this.applyFilter();
        this.selectedChat = null;
        this.selectedChatMessages$.next([]);
        this.csCloseDeleteConfirm();
        setTimeout(() => {
          this.closeChatSettings();
          this.csDeleting = false;
        }, CLOSE_ANIM_MS + 10);
      },
      error: () => {
        this.csShowError('Failed to delete chat.');
        this.csDeleting = false;
        this.csCloseDeleteConfirm();
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CHAT SETTINGS — kick member
  // ══════════════════════════════════════════════════════════════════════════════

  csOpenKickConfirm(user: UserInterface): void {
    this.csKickTargetUser = user;
    this.csKickConfirmClosing = false;
  }

  csCloseKickConfirm(): void {
    if (this.csKickConfirmClosing) return;
    this.csKickConfirmClosing = true;
    clearTimeout(this.csKickCloseTimer);
    this.csKickCloseTimer = setTimeout(() => {
      this.csKickTargetUser = null;
      this.csKickConfirmClosing = false;
    }, CLOSE_ANIM_MS);
  }

  csConfirmKick(): void {
    if (!this.csKickTargetUser) return;
    const user = this.csKickTargetUser;

    this.csKickingUserId = user.id;
    this.csCloseKickConfirm();

    // Wait for the confirmation dialog to finish closing before hitting the server
    setTimeout(() => {
      this.chatUserService.RemoveChatUser({ userId: user.id, chatId: this.selectedChat!.id }).subscribe({
        next: () => {
          this.csMembers = this.csMembers.filter(m => m.id !== user.id);
          this.csKickingUserId = null;
          this.csShowSuccess(`${user.name} was removed.`);
        },
        error: () => {
          this.csKickingUserId = null;
          this.csShowError('You do not have permission to remove members.');
        }
      });
    }, CLOSE_ANIM_MS + 20);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CHAT SETTINGS — alert helpers
  // ══════════════════════════════════════════════════════════════════════════════

  csShowSuccess(msg: string): void {
    this.csSuccessMessage = msg;
    this.csErrorMessage = '';
    clearTimeout(this.csSuccessTimer);
    // Auto-dismiss after 3.5 s
    this.csSuccessTimer = setTimeout(() => { this.csSuccessMessage = ''; }, 3500);
  }

  csShowError(msg: string): void {
    this.csErrorMessage = msg;
    this.csSuccessMessage = '';
  }

  csClearMessages(): void {
    this.csSuccessMessage = '';
    this.csErrorMessage = '';
  }
}