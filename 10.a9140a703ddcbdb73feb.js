(window.webpackJsonp=window.webpackJsonp||[]).push([[10],{"9+vk":function(e,t,n){"use strict";n.r(t),n.d(t,"PageOverlayBModule",function(){return m});var o=n("ofXK"),a=n("tyNb"),i=n("XNiG"),s=n("1G5W"),r=n("fXoL"),c=n("W7Mp"),p=n("3FuT");const d=[{path:"",component:(()=>{class e{constructor(e){this.demoApiService=e,this.loading=!1,this.pageName="Page Overlay B",this.componentDestroyed$=new i.a}ngOnInit(){this.loading=!0,this.demoApiService.simulateLoadData().pipe(Object(s.a)(this.componentDestroyed$)).subscribe(()=>this.loading=!1)}ngOnDestroy(){this.componentDestroyed$.next(),this.componentDestroyed$.complete()}}return e.\u0275fac=function(t){return new(t||e)(r.Eb(c.a))},e.\u0275cmp=r.yb({type:e,selectors:[["ng-component"]],decls:1,vars:2,consts:[[3,"pageName","loading"]],template:function(e,t){1&e&&r.Fb(0,"app-page-content",0),2&e&&r.Tb("pageName",t.pageName)("loading",t.loading)},directives:[p.a],styles:["[_nghost-%COMP%]{display:block;overflow:auto;height:100%;padding:2rem}"]}),e})()}];let l=(()=>{class e{}return e.\u0275mod=r.Cb({type:e}),e.\u0275inj=r.Bb({factory:function(t){return new(t||e)},imports:[[a.g.forChild(d)],a.g]}),e})();var g=n("HF0z");let m=(()=>{class e{}return e.\u0275mod=r.Cb({type:e}),e.\u0275inj=r.Bb({factory:function(t){return new(t||e)},imports:[[o.b,l,g.a]]}),e})()}}]);