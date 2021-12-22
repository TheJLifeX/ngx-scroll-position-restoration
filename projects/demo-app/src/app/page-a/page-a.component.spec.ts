import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageAComponent } from './page-a.component';

describe('PageAComponent', () => {
  let component: PageAComponent;
  let fixture: ComponentFixture<PageAComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PageAComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PageAComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
