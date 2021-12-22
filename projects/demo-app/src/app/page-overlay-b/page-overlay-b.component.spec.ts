import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageOverlayBComponent } from './page-overlay-b.component';

describe('PageOverlayBComponent', () => {
  let component: PageOverlayBComponent;
  let fixture: ComponentFixture<PageOverlayBComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PageOverlayBComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PageOverlayBComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
