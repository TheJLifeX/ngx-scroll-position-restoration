(window.webpackJsonp=window.webpackJsonp||[]).push([[0],{"3FuT":function(e,t,i){"use strict";i.d(t,"a",function(){return l});var s=i("fXoL"),n=i("ofXK"),r=i("tyNb");function c(e,t){if(1&e&&(s.Jb(0,"a",13),s.cc(1),s.Ib()),2&e){const e=s.Qb(3);s.Tb("routerLink",e.actionRouterLink),s.vb(1),s.dc(e.actionName)}}function o(e,t){if(1&e&&(s.Jb(0,"div",5),s.Jb(1,"div",6),s.Fb(2,"img",7),s.Jb(3,"div",8),s.Jb(4,"h5",9),s.cc(5),s.Ib(),s.Jb(6,"h6",10),s.cc(7),s.Ib(),s.Jb(8,"p",11),s.cc(9," Lorem ipsum dolor sit amet consectetur adipisicing elit. Laboriosam, voluptatibus porro aliquam soluta. "),s.Ib(),s.ac(10,c,2,2,"a",12),s.Ib(),s.Ib(),s.Ib()),2&e){const e=t.index,i=s.Qb(2);s.vb(5),s.dc("Card "+e),s.vb(2),s.dc(i.pageName),s.vb(3),s.Tb("ngIf",i.actionRouterLink&&i.actionName)}}function a(e,t){if(1&e&&(s.Hb(0),s.Rb(1),s.Jb(2,"div",3),s.ac(3,o,11,3,"div",4),s.Ib(),s.Gb()),2&e){const e=s.Qb();s.vb(3),s.Tb("ngForOf",e.items)}}function u(e,t){1&e&&(s.Jb(0,"div",14),s.Fb(1,"div",15),s.Ib())}const h=["*"];let l=(()=>{class e{constructor(){this.items=new Array(100)}ngOnInit(){}}return e.\u0275fac=function(t){return new(t||e)},e.\u0275cmp=s.yb({type:e,selectors:[["app-page-content"]],inputs:{pageName:"pageName",loading:"loading",actionRouterLink:"actionRouterLink",actionName:"actionName"},ngContentSelectors:h,decls:5,vars:3,consts:[[1,"text-center","mb-4"],[4,"ngIf","ngIfElse"],["loadingTemplate",""],[1,"row"],["class","col-3 mb-4",4,"ngFor","ngForOf"],[1,"col-3","mb-4"],[1,"card"],["src","assets/image-placeholder.png","alt","Card image placeholder",1,"card-img-top"],[1,"card-body"],[1,"card-title"],[1,"card-subtitle","mb-2","text-muted"],[1,"card-text"],["class","card-link",3,"routerLink",4,"ngIf"],[1,"card-link",3,"routerLink"],[1,"row","justify-content-center"],["role","status",1,"spinner-border","primary-color"]],template:function(e,t){if(1&e&&(s.Sb(),s.Jb(0,"h2",0),s.cc(1),s.Ib(),s.ac(2,a,4,1,"ng-container",1),s.ac(3,u,2,0,"ng-template",null,2,s.bc)),2&e){const e=s.Xb(4);s.vb(1),s.dc(t.pageName),s.vb(1),s.Tb("ngIf",!t.loading)("ngIfElse",e)}},directives:[n.i,n.h,r.e],styles:[""],changeDetection:0}),e})()},HF0z:function(e,t,i){"use strict";i.d(t,"a",function(){return c});var s=i("ofXK"),n=i("tyNb"),r=i("fXoL");let c=(()=>{class e{}return e.\u0275mod=r.Cb({type:e}),e.\u0275inj=r.Bb({factory:function(t){return new(t||e)},imports:[[s.b,n.f]]}),e})()},W7Mp:function(e,t,i){"use strict";i.d(t,"a",function(){return y});var s=i("XNiG"),n=i("LRne"),r=i("1G5W"),c=i("quSY");class o extends c.a{constructor(e,t){super()}schedule(e,t=0){return this}}class a extends o{constructor(e,t){super(e,t),this.scheduler=e,this.work=t,this.pending=!1}schedule(e,t=0){if(this.closed)return this;this.state=e;const i=this.id,s=this.scheduler;return null!=i&&(this.id=this.recycleAsyncId(s,i,t)),this.pending=!0,this.delay=t,this.id=this.id||this.requestAsyncId(s,this.id,t),this}requestAsyncId(e,t,i=0){return setInterval(e.flush.bind(e,this),i)}recycleAsyncId(e,t,i=0){if(null!==i&&this.delay===i&&!1===this.pending)return t;clearInterval(t)}execute(e,t){if(this.closed)return new Error("executing a cancelled action");this.pending=!1;const i=this._execute(e,t);if(i)return i;!1===this.pending&&null!=this.id&&(this.id=this.recycleAsyncId(this.scheduler,this.id,null))}_execute(e,t){let i,s=!1;try{this.work(e)}catch(n){s=!0,i=!!n&&n||new Error(n)}if(s)return this.unsubscribe(),i}_unsubscribe(){const e=this.id,t=this.scheduler,i=t.actions,s=i.indexOf(this);this.work=null,this.state=null,this.pending=!1,this.scheduler=null,-1!==s&&i.splice(s,1),null!=e&&(this.id=this.recycleAsyncId(t,e,null)),this.delay=null}}let u=(()=>{class e{constructor(t,i=e.now){this.SchedulerAction=t,this.now=i}schedule(e,t=0,i){return new this.SchedulerAction(this,e).schedule(i,t)}}return e.now=()=>Date.now(),e})();class h extends u{constructor(e,t=u.now){super(e,()=>h.delegate&&h.delegate!==this?h.delegate.now():t()),this.actions=[],this.active=!1,this.scheduled=void 0}schedule(e,t=0,i){return h.delegate&&h.delegate!==this?h.delegate.schedule(e,t,i):super.schedule(e,t,i)}flush(e){const{actions:t}=this;if(this.active)return void t.push(e);let i;this.active=!0;do{if(i=e.execute(e.state,e.delay))break}while(e=t.shift());if(this.active=!1,i){for(;e=t.shift();)e.unsubscribe();throw i}}}const l=new h(a);var d=i("7o/Q"),b=i("EY2u"),f=i("HDdC");let p=(()=>{class e{constructor(e,t,i){this.kind=e,this.value=t,this.error=i,this.hasValue="N"===e}observe(e){switch(this.kind){case"N":return e.next&&e.next(this.value);case"E":return e.error&&e.error(this.error);case"C":return e.complete&&e.complete()}}do(e,t,i){switch(this.kind){case"N":return e&&e(this.value);case"E":return t&&t(this.error);case"C":return i&&i()}}accept(e,t,i){return e&&"function"==typeof e.next?this.observe(e):this.do(e,t,i)}toObservable(){switch(this.kind){case"N":return Object(n.a)(this.value);case"E":return e=this.error,new f.a(t=>t.error(e));case"C":return Object(b.b)()}var e;throw new Error("unexpected notification kind value")}static createNext(t){return void 0!==t?new e("N",t):e.undefinedValueNotification}static createError(t){return new e("E",void 0,t)}static createComplete(){return e.completeNotification}}return e.completeNotification=new e("C"),e.undefinedValueNotification=new e("N",void 0),e})();class v{constructor(e,t){this.delay=e,this.scheduler=t}call(e,t){return t.subscribe(new g(e,this.delay,this.scheduler))}}class g extends d.a{constructor(e,t,i){super(e),this.delay=t,this.scheduler=i,this.queue=[],this.active=!1,this.errored=!1}static dispatch(e){const t=e.source,i=t.queue,s=e.scheduler,n=e.destination;for(;i.length>0&&i[0].time-s.now()<=0;)i.shift().notification.observe(n);if(i.length>0){const t=Math.max(0,i[0].time-s.now());this.schedule(e,t)}else this.unsubscribe(),t.active=!1}_schedule(e){this.active=!0,this.destination.add(e.schedule(g.dispatch,this.delay,{source:this,destination:this.destination,scheduler:e}))}scheduleNotification(e){if(!0===this.errored)return;const t=this.scheduler,i=new m(t.now()+this.delay,e);this.queue.push(i),!1===this.active&&this._schedule(t)}_next(e){this.scheduleNotification(p.createNext(e))}_error(e){this.errored=!0,this.queue=[],this.destination.error(e),this.unsubscribe()}_complete(){this.scheduleNotification(p.createComplete()),this.unsubscribe()}}class m{constructor(e,t){this.time=e,this.notification=t}}var w=i("fXoL");let y=(()=>{class e{constructor(){this.serviceDestroyed$=new s.a}simulateLoadData(){const e=Math.floor(150+300*Math.random());return Object(n.a)([]).pipe(Object(r.a)(this.serviceDestroyed$),function(e,t=l){var i;const s=(i=e)instanceof Date&&!isNaN(+i)?+e-t.now():Math.abs(e);return e=>e.lift(new v(s,t))}(e))}ngOnDestroy(){this.serviceDestroyed$.next(),this.serviceDestroyed$.complete()}}return e.\u0275fac=function(t){return new(t||e)},e.\u0275prov=w.Ab({token:e,factory:e.\u0275fac,providedIn:"root"}),e})()}}]);