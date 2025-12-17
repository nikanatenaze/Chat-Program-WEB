import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Messenger } from './messenger';

describe('Messenger', () => {
  let component: Messenger;
  let fixture: ComponentFixture<Messenger>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Messenger]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Messenger);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
