import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageBTabAComponent } from './page-b-tab-a.component';

describe('PageBTabAComponent', () => {
  let component: PageBTabAComponent;
  let fixture: ComponentFixture<PageBTabAComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PageBTabAComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PageBTabAComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
