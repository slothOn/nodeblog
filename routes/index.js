var express = require('express');
var router = express.Router();
var crypto = require('crypto'), //nodejs core用来生成散列值
    User = require('../models/user.js'),
    Post = require('../models/post.js'),
    Comment = require('../models/comment.js');

/*
/首页
/login登录
/reg注册
/post发表文章
/logout退出
 */

module.exports = function(app) {
  app.get('/', function(req, res) {
    var page = parseInt(req.query.p) || 1;
    Post.getTen(null, page, function(err, posts, total) {
      if (err) {
        posts = [];
      }
      res.render('index', {
        title : '主页',
        user : req.session.user,
        success : req.flash('success').toString(),
        error : req.flash('error').toString(),
        posts : posts,
        page: page,
        isFirstPage: (page - 1) == 0,
        isLastPage: ((page - 1) * 10 + posts.length) == total
      });
    });
  });
  app.get('/blog', function(req, res) {
    res.send('Hello World');
  });

  app.get('/reg', checkNotLogin);
  app.get('/reg', function(req, res) {
    res.render('reg', {
      title : '注册',
      user : req.session.user,
      success : req.flash('success').toString(),
      error : req.flash('error').toString()
    });
  });
  app.post('/reg', checkNotLogin);
  app.post('/reg', function(req, res) {
    var name = req.body.name,
      password = req.body.password,
      password_re = req.body['password-repeat'];
    if (password != password_re) {
      req.flash('error', '两次输入密码不一致');
      return res.redirect('/reg');
    }
    var md5 = crypto.createHash('md5');
    password = md5.update(req.body.password).digest('hex');
    var newUser = new User({
      name: name,
      password: password,
      email: req.body.email
    });
    User.get(newUser.name, function(err, user) {
      if (err) {
        req.flash("error", err);
        return res.redirect('/');
      }
      if (user) {
        req.flash("error", "用户已存在");
        return res.redirect('/reg');
      }
      newUser.save(function(err, user) {
        if (err) {
          req.flash('error', err);
          return res.redirect('/reg');
        }
        req.session.user = newUser;//用户信息存入session
        req.flash('success', "注册成功");
        res.redirect('/');
      });
    })
  });

  app.get('/login', checkNotLogin);
  app.get('/login', function(req, res) {
    res.render('login', {
      title : '登录',
      user : req.session.user,
      success : req.flash('success').toString(),
      error : req.flash('error').toString()
    });
  });
  app.post('/login', checkNotLogin);
  app.post('/login', function(req, res) {
    var md5 = crypto.createHash('md5');
    var password = md5.update(req.body.password).digest('hex');
    User.get(req.body.name, function (err, user) {
      if (!user) {
        req.flash('error', '用户不存在');
        return res.redirect('/login');
      }
      if (user.password != password) {
        req.flash('error', '密码错误');
        return res.redirect('/login');
      }
      req.session.user = user;
      req.flash('success', '登录成功');
      res.redirect('/');
    })
  });

  app.get('/logout', checkLogin);
  app.get('/logout', function(req, res) {
    req.session.user = null;
    req.flash('success', '登出成功!');
    res.redirect('/');
  });

  app.get('/post', function(req, res) {
    res.render('post', {
      title: '发表',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
  app.post('/post', checkLogin);
  app.post('/post', function(req, res) {
    var curuser = req.session.user;
    var tags = [req.body.tag1, req.body.tag2, req.body.tag3];
    var post = new Post(curuser.name, req.body.title, tags, req.body.post);
    post.save(function(err) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }
      req.flash('success', '发布成功');
      res.redirect('/');
    });
  });

  app.get('/upload', checkLogin);
  app.get('/upload', function (req, res) {
    res.render('upload', {
      title: '文件上传',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });

  app.post('/upload', checkLogin);
  app.post('/upload', function (req, res) {
    req.flash('success', '文件上传成功');
    res.redirect('/upload');
  });

  app.get("/u/:name", function(req, res) {
    var page = parseInt(req.query.p) || 1;
    //检查用户是否存在
    User.get(req.params.name, function(err, user) {
      if (!user) {
        req.flash('error', '用户不存在');
        return res.redirect('/');
      }
      Post.getTen(user.name, page, function(err, posts, total) {
        if (err) {
          req.flash('error', err);
          return res.redirect('/');
        }
        res.render('user', {
          title: user.name,
          posts: posts,
          page: page,
          isFirstPage: (page - 1) == 0,
          isLastPage: ((page - 1) * 10 + posts.length) == total,
          user: req.session.user,
          success: req.flash('success').toString(),
          error: req.flash('error').toString()
        });
      });
    });
  });

  app.get('/u/:name/:day/:title', function(req, res) {
    Post.getOne(req.params.name, req.params.day, req.params.title, function(err, post) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }
      res.render('article', {
        title: req.params.title,
        post: post,
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      });
    });
  });
  app.post('/u/:name/:day/:title', function (req, res) {
    var date = new Date(),
      time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
          date.getHours() + ":" + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes());
    var comment = {
      name: req.body.name,
      email: req.body.email,
      website: req.body.website,
      time: time,
      content: req.body.content
    };
    var newComment = new Comment(req.params.name, req.params.day, req.params.title, comment);
    newComment.save(function (err) {
      if (err) {
        req.flash('error', err);
        return res.redirect('back');
      }
      req.flash('success', '留言成功');
      res.redirect('back');
    });
  });

  app.get('/:name/:day/:title/edit', checkLogin);
  app.get('/:name/:day/:title/edit', function(req, res) {
    var curUser = req.session.user;
    Post.edit(curUser.name, req.params.day, req.params.title, function(err, post) {
      if (err) {
        req.flash('error', err);
        return res.redirect('back');
      }
      res.render('edit', {
        title: '编辑',
        post: post,
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      });
    })
  });

  app.post('/:name/:day/:title/edit', checkLogin);
  app.post('/:name/:day/:title/edit', function(req, res) {
    var curUser = req.session.user;
    Post.update(curUser.name, req.params.day, req.params.title, req.body.post, function(err) {
      var url = encodeURI('/u/' + req.params.name + '/' + req.params.day + '/' + req.params.title);
      if (err) {
        req.flash('error', err);
        return res.redirect(url);
      }
      req.flash('success', '修改成功');
      return res.redirect(url);
    });
  });

  app.get('/:name/:day/:title/remove', checkLogin);
  app.get('/:name/:day/:title/remove', function(req, res) {
    var curUser = req.session.user;
    Post.remove(curUser.name, req.params.name, req.params.title, function(err) {
      if (err) {
        req.flash('error', err);
        return res.redirect('back');
      }
      req.flash('success', '修改成功');
      res.redirect('/');
    });
  });

  app.get('/archive', function (req, res) {
    Post.getArchive(function (err, posts) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }
      res.render('archive', {
        title: '存档',
        posts: posts,
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      });
    });
  });

  app.get('/tags', function (req, res) {
    Post.getTags(function (err, posts) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }
      res.render('tags', {
        title: '标签',
        posts: posts,
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      });
    })
  });
  app.get('/tags/:tag', function (req, res) {
    Post.getTag(req.params.tag, function (err, posts) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }
      res.render('tag', {
        title: 'TAG:' + req.params.tag,
        posts: posts,
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      });
    });
  });
};

function checkLogin(req, res, next) {
  if (!req.session.user) {
    req.flash('error', '未登录');
    res.redirect('/login');
  }
  next();
}

function checkNotLogin(req, res, next) {
  if (req.session.user) {
    req.flash('error', '已登录');
    res.redirect('back');//返回之前页面
  }
  next();
}