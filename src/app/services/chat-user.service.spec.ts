import { TestBed } from '@angular/core/testing';

import { ChatUserService } from './chat-user.service';

describe('ChatUserService', () => {
  let service: ChatUserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatUserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
