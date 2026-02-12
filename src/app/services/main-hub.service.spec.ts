import { TestBed } from '@angular/core/testing';

import { MainHubService } from './main-hub.service';

describe('MainHubService', () => {
  let service: MainHubService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MainHubService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
