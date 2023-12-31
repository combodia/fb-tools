const mysql = require('mysql2');
export default class FBTools {
    constructor(mainWindow) {
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
            login_pass: '',
            visible: 0
        };
        this.mainWindow = mainWindow;
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
        if ( this.needLogin ){
            if (!this.logintimer) this.logintimer = setTimeout(()=>{
                clearTimeout(this.logintimer);
                delete this.logintimer;
                this.check(index);
            },1e3);
            return;
        }
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
        
        let url = 'https://facebook.com/'+dom.dataset.id
        if (!this.win ){
            nw.Window.open( url,{
                show: false
                // show: this.setting.visible != 0
                // inject_js_end: 'main/inject-end.js'
            }, win=> {
                this.win = win;
                win.on('loaded',()=>{
                    console.log('win.loaded');
                    let doc = win.window.document;
                    let form = doc.querySelector('form#login_form');
                    if ( form )return this.login(form);
                    this.needLogin = false;
                    let ptl = doc.querySelector('div[data-pagelet="ProfileTimeline"]');
                    if ( !ptl ){
                        console.log('ptl not found');
                        return this.setState(-1, 1, 1 );
                    }
                    let post = doc.querySelectorAll('div[data-pagelet="ProfileTimeline"]>div');
                    if ( post.length == 0 )return this.setState(1, 1, 1);
                    for( let div of post ){
                        // console.log(div);
                        let child = div.children[1] || div.children[0];
                        if ( !child ) continue;
                        if ( this.hasNewPost( child ) )return this.setState(1,1,1);
                    }
                    this.setState(-1, 1, 1 );
                })
            })
        }else this.win.window.location.href = url;//this.win.close(),delete this.win;
        console.log( 'index',index, 'page', this.page + '/' + this.pages +':'+ this.max );
        
    }
    hasNewPost(div){
        let ts = div.querySelector('div>div>div>span>span>span>span>a[aria-label][role="link"]>span');
        if ( !ts )return console.log(div);
        ts = ts.textContent.trim().match(/(\d)+/ig);
        let l = ts.length;
        if ( !ts || l < 2 || l > 3)return true;
        if ( !this._years )this._years = parseFloat(this.setting.years_ago);
        if ( this._years == 0)return true;
        ts = ts.join('-');
        if ( l == 2 ){
            if ( !this._date )this._date = new Date();
            ts = this._date.getFullYear() +'-'+ ts;
        }
        let d = new Date(ts);
        console.log(ts,l);
        try{
            let years_ago = (Date.now() - d.getTime()) / 31536e6;
            if ( years_ago < this._years )return true;
        }catch(err){console.log(err)}
    }
    login(form){
        if(this.win)this.win.show();
        this.needLogin = true;
        let email = this.setting.login_email;
        if ( !email || !pass  )return;
        let pass = this.setting.login_pass;
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
                let msg = `Limit: ${this.setting.limit}, Page: ${this.page}/${this.max}, Total: ${this.total}`;
                console.log(msg);
                
                document.body.innerHTML = `<progress id="progress"></progress><div>${msg}</div>`;
                let ol = document.createElement('ol');
                document.body.appendChild(ol);
                ol.className = 'list';
                ol.ondblclick = (e)=>{
                    if (e.target == ol )return;
                    let li = e.target.tagName == 'SPAN'?e.target.parentNode:e.target;
                    window.open('https://facebook.com/'+li.dataset.id);
                }
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

    setTitle( title ){
        title = title || this.setting.login_email;
        if ( !title || title == 'null')title = 'FB Tools - ' + process.cwd();
        if ( 'setTitle' in this.mainWindow ) this.mainWindow.setTitle( title );
        else document.title = title;
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
            for (let k in conf) {
                if ( !btn.dataset.text )btn.dataset.text = btn.textContent;
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
            
            this.setTitle();
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

                this.setTitle();
            } catch (err) {
                console.log(err)
            }
        }
    }
}