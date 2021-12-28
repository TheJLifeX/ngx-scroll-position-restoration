import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageBTabBComponent } from './page-b-tab-b.component';

describe('PageBTabBComponent', () => {
  let component: PageBTabBComponent;
  let fixture: ComponentFixture<PageBTabBComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PageBTabBComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PageBTabBComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
