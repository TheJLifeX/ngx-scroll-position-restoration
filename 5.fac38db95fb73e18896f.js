(window.webpackJsonp=window.webpackJsonp||[]).push([[5],{KxOB:function(e,t,n){"use strict";n.r(t),n.d(t,"PageAModule",function(){return u});var o=n("ofXK"),s=n("tyNb"),i=n("XNiG"),a=n("1G5W"),c=n("fXoL"),r=n("W7Mp"),p=n("3FuT");const d=[{path:"",component:(()=>{class e{constructor(e){this.demoApiService=e,this.loading=!1,this.pageName="Page A",this.componentDestroyed$=new i.a}ngOnInit(){this.loading=!0,this.demoApiService.simulateLoadData().pipe(Object(a.a)(this.componentDestroyed$)).subscribe(()=>this.loading=!1)}ngOnDestroy(){this.componentDestroyed$.next(),this.componentDestroyed$.complete()}}return e.\u0275fac=function(t){return new(t||e)(c.Eb(r.a))},e.\u0275cmp=c.yb({type:e,selectors:[["ng-component"]],decls:1,vars:2,consts:[[3,"pageName","loading"]],template:function(e,t){1&e&&c.Fb(0,"app-page-content",0),2&e&&c.Tb("pageName",t.pageName)("loading",t.loading)},directives:[p.a],styles:["[_nghost-%COMP%]{display:block}"]}),e})()}];let l=(()=>{class e{}return e.\u0275mod=c.Cb({type:e}),e.\u0275inj=c.Bb({factory:function(t){return new(t||e)},imports:[[s.f.forChild(d)],s.f]}),e})();var m=n("HF0z");let u=(()=>{class e{}return e.\u0275mod=c.Cb({type:e}),e.\u0275inj=c.Bb({factory:function(t){return new(t||e)},imports:[[o.b,l,m.a]]}),e})()}}]);