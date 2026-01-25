import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountCenter } from './account-center';

describe('AccountCenter', () => {
  let component: AccountCenter;
  let fixture: ComponentFixture<AccountCenter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AccountCenter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountCenter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
