import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { ChatUserService } from '../../services/chat-user.service';
import { User } from '../../services/user';
import { ChatInterface } from '../../interfaces/chat.interface';
import { UserInterface } from '../../interfaces/user.interface';
import { TokenModelInterface } from '../../interfaces/token-model.interface';
import { forkJoin } from 'rxjs';

const CLOSE_ANIM_MS = 210;

@Component({
  selector: 'app-chat-settings',
  standalone: false,
  templateUrl: './chat-settings.html',
  styleUrl: './chat-settings.css',
})
export class ChatSettings implements OnInit {

  // ─── Route / auth ────────────────────────────────────────────────────────────
  chatId!: number;
  tokenData!: TokenModelInterface;

  // ─── Data ────────────────────────────────────────────────────────────────────
  chat!: ChatInterface;
  members: UserInterface[] = [];

  // ─── Loading flags ───────────────────────────────────────────────────────────
  isLoading = true;
  isSaving = false;
  isDeleting = false;
  isUploadingImage = false;

  // ─── Edit form ───────────────────────────────────────────────────────────────
  chatName = '';
  hasPassword = false;
  password = '';
  confirmPassword = '';

  // ─── UI state ────────────────────────────────────────────────────────────────
  activeTab: 'general' | 'members' = 'general';
  imagePreview: string | null = null;
  successMessage = '';
  errorMessage = '';

  // ─── Delete chat confirm ──────────────────────────────────────────────────────
  showDeleteConfirm = false;
  deleteConfirmClosing = false;

  // ─── Kick member confirm ──────────────────────────────────────────────────────
  kickTargetUser: UserInterface | null = null;
  kickConfirmClosing = false;
  kickingUserId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private chatService: ChatService,
    private chatUserService: ChatUserService,
    private userService: User
  ) { }

  ngOnInit(): void {
    this.chatId = Number(this.route.snapshot.paramMap.get('id'));
    this.userService.getDataFromToken().subscribe(token => {
      this.tokenData = token;
      this.loadAll();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Data loading
  // ═══════════════════════════════════════════════════════════════════════════

  loadAll(): void {
    this.isLoading = true;
    forkJoin([
      this.chatService.GetChatById(this.chatId),
      this.chatUserService.GetUsersInChat(this.chatId)
    ]).subscribe({
      next: ([chat, members]) => {
        this.chat = chat;
        this.members = members;
        this.chatName = chat.name;
        this.hasPassword = chat.hasPassword;
        this.imagePreview = chat.chatImageUrl ?? null;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load chat.';
        this.isLoading = false;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Tabs
  // ═══════════════════════════════════════════════════════════════════════════

  setTab(tab: 'general' | 'members'): void {
    this.activeTab = tab;
    this.clearMessages();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Image upload
  // ═══════════════════════════════════════════════════════════════════════════

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];

    const reader = new FileReader();
    reader.onload = e => { this.imagePreview = e.target?.result as string; };
    reader.readAsDataURL(file);

    this.isUploadingImage = true;
    this.chatService.uploadChatImage(this.chatId, file).subscribe({
      next: res => {
        this.imagePreview = res.ImageUrl;
        this.showSuccess('Chat image updated!');
        this.isUploadingImage = false;
      },
      error: () => {
        this.showError('Failed to upload image.');
        this.isUploadingImage = false;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Save settings
  // ═══════════════════════════════════════════════════════════════════════════

  onTogglePassword(): void {
    this.hasPassword = !this.hasPassword;
    if (!this.hasPassword) { this.password = ''; this.confirmPassword = ''; }
  }

  onSaveChanges(): void {
    this.clearMessages();
    if (!this.chatName.trim()) { this.showError('Chat name cannot be empty.'); return; }
    if (this.hasPassword && this.password !== this.confirmPassword) {
      this.showError('Passwords do not match.');
      return;
    }

    this.isSaving = true;
    this.chatService.UpdateChat({
      id: this.chatId,
      name: this.chatName.trim(),
      hasPassword: this.hasPassword,
      password: this.password
    }).subscribe({
      next: updated => {
        this.chat = updated;
        this.showSuccess('Settings saved!');
        this.isSaving = false;
      },
      error: () => {
        this.showError('Failed to save settings.');
        this.isSaving = false;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Members — kick
  // ═══════════════════════════════════════════════════════════════════════════

  get isOwner(): boolean {
    return this.tokenData?.id === this.chat?.createdByUserId;
  }

  isCurrentUser(user: UserInterface): boolean {
    return user.id === this.tokenData?.id;
  }

  openKickConfirm(user: UserInterface): void {
    this.kickTargetUser = user;
    this.kickConfirmClosing = false;
  }

  closeKickConfirm(): void {
    if (this.kickConfirmClosing) return;
    this.kickConfirmClosing = true;
    setTimeout(() => {
      this.kickTargetUser = null;
      this.kickConfirmClosing = false;
    }, CLOSE_ANIM_MS);
  }

  confirmKick(): void {
    if (!this.kickTargetUser) return;
    const user = this.kickTargetUser;
    this.kickingUserId = user.id;
    this.closeKickConfirm();

    setTimeout(() => {
      this.chatUserService.RemoveChatUser({ userId: user.id, chatId: this.chatId }).subscribe({
        next: () => {
          this.members = this.members.filter(m => m.id !== user.id);
          this.kickingUserId = null;
          this.showSuccess(`${user.name} was removed.`);
        },
        error: () => {
          this.kickingUserId = null;
          this.showError('Failed to remove member.');
        }
      });
    }, CLOSE_ANIM_MS + 20);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Delete chat
  // ═══════════════════════════════════════════════════════════════════════════

  openDeleteConfirm(): void {
    this.showDeleteConfirm = true;
    this.deleteConfirmClosing = false;
  }

  closeDeleteConfirm(): void {
    if (this.deleteConfirmClosing) return;
    this.deleteConfirmClosing = true;
    setTimeout(() => {
      this.showDeleteConfirm = false;
      this.deleteConfirmClosing = false;
    }, CLOSE_ANIM_MS);
  }

  onDeleteChat(): void {
    this.isDeleting = true;
    this.chatService.DeleteChat(this.chatId).subscribe({
      next: () => this.router.navigate(['/chats']),
      error: () => {
        this.showError('Failed to delete chat.');
        this.isDeleting = false;
        this.closeDeleteConfirm();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  goBack(): void { this.router.navigate(['/messenger']); }

  getInitial(name: string): string { return name.charAt(0).toUpperCase(); }

  showSuccess(msg: string): void {
    this.successMessage = msg;
    this.errorMessage = '';
    setTimeout(() => { this.successMessage = ''; }, 3500);
  }

  showError(msg: string): void {
    this.errorMessage = msg;
    this.successMessage = '';
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  get passwordsMatch(): boolean {
    return !this.confirmPassword || this.password === this.confirmPassword;
  }
}