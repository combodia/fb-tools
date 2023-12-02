const mysql = require('mysql2');
export default class FBTools {
    constructor() {
        this.connection = null;
        this.page = 1;
        this.index = 0;
        this.setting = {
            host: 'localhost',
            port: 3306,
            username: 'root',
            password: '',
            database: 'facebook',
            charset: 'utf8mb4',
            fields: 'id,name,state',
            table: 'facebook',
            where: "WHERE `sex`='2'",
            limit: 1000,
            max: 100,
            start: 1,
            years_ago: 1,
            login_email: '',
            login_pass: ''
        };
    }
    
    complete(){
        // alert('Completed.');
        // location.reload();
        console.log( 'completed' );
    }
    setState(state, update, next ){
        if ( !this.dom)return;
        console.log('state', state, update, next );
        this.dom.dataset.state = state;
        if ( update ){
            this.connection.query("UPDATE `"+this.setting.table+"` SET `state`="+state+" WHERE `id`='"+this.dom.dataset.id+"'");
        }
        if ( next ){
            // if (this.win )this.win.close(),delete this.win;
            this.check(this.index + 1);
        }
        
    }
    check(index){
        // console.log('index', index);
        // this.progress.max = this.setting.limit;
        this.progress.value = index;
        index = parseInt(index);
        if ( index >= this.setting.limit ){
            if ( this.page < this.max  )return this.query(1);
            // this.complete();
            // return console.log('completed 1', this.page );
        }
        
        let dom = this.list[index] || document.querySelector('ol.list>li:nth-child('+index+')');
        this.index = index;
        if ( !dom){
            if ( this.page < this.max )return this.query(1);
            this.complete();
            return console.log('completed 2', this.page );
        }
        this.dom = dom;
        if ( dom.dataset.state != 0 ){
            console.log('state in dom', dom.dataset.state);
            return this.check(index + 1);
        }
        
        if (this.win )this.win.close(),delete this.win;
        console.log( 'index',index, 'page', this.page + '/' + this.pages +':'+ this.max );
        nw.Window.open('https://facebook.com/'+dom.dataset.id,{
            show:false
            // inject_js_end: 'main/inject-end.js'
        }, win=> {
            this.win = win;
            win.on('loaded',()=>{
                console.log('win.loaded');
                win.window.fbtools_next = ()=>{
                    win.close();
                }
                setTimeout(()=>{
                    let form = win.window.document.querySelector('form#login_form');
                    if ( form )return this.login(form);
                    let ptl = document.querySelector('div[data-pagelet="ProfileTimeline"]');
                    if ( !ptl ) return this.setState(-1, 1, 1 );
                    let post = document.querySelectorAll('div[data-pagelet="ProfileTimeline"]>div');
                    if ( post.length == 0 )return this.setState(1, 1, 1);
                    for( let div of post ){
                        let child = div.children[1] || div.children[0];
                        if ( !child ) continue;
                        if ( this.hasNewPost( child ) )return this.setState(1,1,1);
                    }
                    this.setState(-1, 1, 1 );
                },1e3);
            })
        })
    }
    hasNewPost(div){
        let ts = div.querySelector('div>div>div>span>span>span>span>a[aria-label][role="link"]>span');
        ts = ts.textContent.trim().match(/(\d)+/ig);
        if ( !ts || ts.length < 2)return true;
        if ( !this._years )this._years = parseFloat(this.setting.yearsAgo);
        if ( !this._years == 0)return true;
        let d = new Date(ts.join('-'));
        if ( ts.length == 2 ){
            if ( !this._date )this._date = new Date();
            d = this._date.getFullYear() + d;
        }
        try{
            let yearsAgo = (Date.now() - d.getTime()) / 31536e6;
            if ( yearsAgo < this._years )return true;
        }catch(err){console.log(err)}
    }
    login(form){
        if(this.win)this.win.show();
        let email = this.setting.login_email;
        let pass = this.setting.login_pass;
        if ( !email || !pass  )return;
        let u = form.querySelector('input[name="email"]');
        let p = form.querySelector('input[name="pass"]');
        u.value = email;
        p.value = pass;
        form.submit();
    }
    sql(f){
        let conf = this.setting;
        f = f || conf.fields;
        let start = (this.page - 1) * conf.limit;
        let field = f != '*'? '`'+f.replace(/[\'\`\s]/i,'').split(',').join('`,`')+'`':'*';
        return `SELECT ${field} FROM ${conf.table} ${this.setting.where} LIMIT ${start},${conf.limit}`;
    }
    query(p){

        if (p)this.page += 1;
        if ( this.page > this.max )return this.complete();
        this.index = 0;
        let k = 'COUNT(id)';
        let callback = ()=>{
            callback = null;
            this.connection.query(this.sql(), (err, res)=>{
                if ( err ){
                    console.log(err);
                    alert('Error'); 
                    return;
                }
                let msg = `Limit: ${this.setting.limit}, Page: ${this.page}/${this.max}, Total Pages: ${this.total}`;
                console.log(msg);
                
                document.body.innerHTML = `<progress id="progress"></progress><div>${msg}</div>`;
                let ol = document.createElement('ol');
                document.body.appendChild(ol);
                ol.className = 'list';
                // ol.onclick = (e)=>{
                //     if (e.target == ol )return;
                //     let li = e.target.tagName == 'SPAN'?e.target.parentNode:e.target;
                //     this.check(li.dataset.index)
                // }
                res.forEach((o,i)=>{
                    let li = document.createElement('li');
                    li.innerHTML = `<span>${o.name}</span>`;
                    li.dataset.id = o.id;
                    li.dataset.state = o.state;
                    li.dataset.index = i;
                    ol.appendChild(li)
                });
                this.progress = document.querySelector('progress#progress');
                this.progress.max = this.setting.limit;
                this.list = document.querySelectorAll('ol.list>li');
                this.check(0);
            });
        }
        if (!this.total) return this.connection.query( `SELECT ${k} FROM ${this.setting.table} ${this.setting.where}`, (err, result) => {
            if (err){
                console.log(err);
                alert('Error');
                return;
            }
            this.total = result[0][k];
            this.pages = Math.ceil(this.total/this.setting.limit);
            this.max = Math.min( this.setting.max, this.pages );
            callback();
        });
        console.log('current page', this.page );
        callback && callback();
    }
    loadSetting(form) {
        if (!(form instanceof HTMLFormElement)) return;
        // form.querySelectorAll('input[type="number"]').forEach(input=>{
        //     input.oninput = ()=>{
        //         if (input.max && input.value > input.max )input.value = input.max;
        //         if (input.min && input.value < input.min )input.value = input.min;
        //     }
        // });
        form.addEventListener('submit', e => {
            let conf = this.setting;
            let btn = form.querySelector('button[type="submit"]');
            btn.textContent = 'Connecting ...'
            if ( !btn.dataset.text )btn.dataset.text = btn.textContent;
            for (let k in conf) {
                if (k in form) {
                    let val = form[k].value;
                    if (/^([0-9])+$/ig.test(val)) val = parseInt(val);
                    conf[k] = val;
                }
            }
            localStorage.setItem('setting', JSON.stringify(conf));
        
            console.log(conf);
            if(!this.connection)this.connection = mysql.createConnection({
                host: conf.host,
                user: conf.username,
                password: conf.password,
                database: conf.database
            });
            
            console.log('connection',this.connection);
            this.connection.connect(err=>{
                btn.textContent = btn.dataset.text;
                if (err){
                    alert('Error');
                    console.log(err);
                    return;
                }
                console.log('connected');
                this.query();
            });
            
            this.setting = conf;
            this.page = conf.start;
            
            // // 使用占位符
            // this.connection.query(
            //     'SELECT * FROM `table` WHERE `name` = ? AND `age` > ?',
            //     ['Page', 45],
            //     function (err, results) {
            //         console.log(results);
            //     }
            // );
            e.preventDefault();
            return false;
        });
        let str = localStorage.getItem('setting');
        if (str) {
            console.log(str);
            try {
                str = JSON.parse(str.trim());
                for (let k in str) {
                    if (k in form) form[k].value = this.setting[k] = str[k];
                }
            } catch (err) {
                console.log(err)
            }
        }
    }
}