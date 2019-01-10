/**
 * Created by TONNIE on 3/6/2018.
 */
var router = require('express').Router();
var mongoose = require('mongoose');
var User = mongoose.model('User');
var Basic = mongoose.model('Basic');
var auth = require('../auth');
var multer = require('multer');
var path = require('path');
var nodemailer = require('nodemailer');

// Preload video objects on routes with ':basic'
router.param('basic', function(req, res, next, slug) {
    Basic.findOne({ slug: slug})
        .populate('author')
        .then(function (basic) {
            if (!basic) { return res.sendStatus(404); }

            req.basic = basic;

            return next();
        }).catch(next);
});

// Post basic account audio
router.post('/upload', auth.required, function(req, res, next) {
    User.findById(req.payload.id).then(function(user){
        if (!user) { return res.sendStatus(401); }

        var basic = new Basic(req.body.basic);

        basic.author = user;

        return basic.save().then(function(){
            /*var transporter = nodemailer.createTransport({
             service: 'gmail',
             auth: {
             user: 'dudevegan@gmail.com',
             pass: 'project12345'
             }
             });

             var mailOptions = {
             from: 'dudevegan@gmail.com',
             to: user.email,
             subject: 'Audio successfully uploaded!',
             text: 'Your audio was successfully uploaded.'
             };

             transporter.sendMail(mailOptions, function(error, info){
             if (error) {
             console.log(error);
             } else {
             console.log('Email sent: ' + info.response);
             }
             });*/

            return res.json({basic: basic.toJSONFor(user)});
        });
    }).catch(next);
});

// Post single audio
router.post('/videoUpload', auth.required, function(req, res, next) {
    User.findById(req.payload.id).then(function(user){
        if (!user) { return res.sendStatus(401); }

        var storage = multer.diskStorage({ //multers disk storage settings
            destination: function (req, file, cb) {
                // cb(null, './uploads/')
                cb(null, 'C:/xampp/htdocs/uploads/')
            },
            filename: function (req, file, cb) {
                var datetimestamp = Date.now();
                // cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1])

                cb(null, file.originalname)
            },
            path: function () {

            }
        });

        var upload = multer({ //multer settings
            storage: storage
        }).single('file');

        upload(req,res,function(err){
            if(err){
                res.json({error_code:1, err_desc:err});
                return;
            }

            res.json({error_code:0, err_desc:null});
        });
    }).catch(next);
});

// Get audios
router.get('/reviews', function(req, res, next) {
    var query = {};
    var limit = 20;
    var offset = 0;

    if(typeof req.query.limit !== 'undefined'){
        limit = req.query.limit;
    }

    if(typeof req.query.offset !== 'undefined'){
        offset = req.query.offset;
    }

    return Promise.all([
        Basic.find()
            .limit(Number(limit))
            .skip(Number(offset))
            .sort({createdAt: 'desc'})
            .populate('author')
            .exec(),
        Basic.count().exec(),
        req.payload ? User.findById(req.payload.id) : null
    ]).then(function (results) {
        var reviews = results[0];
        var reviewsCount = results[1];
        var user = results[2];

        return res.json({
            reviews: reviews.map(function (review) {
                return review.toJSONFor(user);
            }),
            reviewsCount: reviewsCount
        });
    }).catch(next);
});

// Search Clips
router.get('/searchClip', function(req, res, next) {
    var query = {};
    var limit = 20;
    var offset = 0;

    if(typeof req.query.limit !== 'undefined'){
        limit = req.query.limit;
    }

    if(typeof req.query.offset !== 'undefined'){
        offset = req.query.offset;
    }

    if (req.query.search) {
        query.search = req.query.search
    }

    return Promise.all([
        Basic.find()
            .limit(Number(limit))
            .skip(Number(offset))
            .sort({createdAt: 'desc'})
            .populate('author')
            .exec(),
        Basic.count().exec(),
        req.payload ? User.findById(req.payload.id) : null
    ]).then(function (results) {
        var theResults = results[0];

        var searchResults = [];

        for (var i=0; i<theResults.length; i++){
            var theNames = theResults[i].clipName;
            var theNotes = theResults[i].notes;

            var jj = theNames.includes(query.search);
            var kk = theNotes.includes(query.search);

            if (jj === true || kk === true){
                searchResults.push(theResults[i]);
            }
        }

        var searchResultsCount = results[1];
        var user = results[2];

        return res.json({
            searchResults: searchResults.map(function (searchResult) {
                return searchResult.toJSONFor(user);
            }),
            searchResultsCount: searchResultsCount
        });
    }).catch(next);
});

// Update files
router.put('/update', auth.required, function(req, res, next) {
    var query = {};

    if (req.query.slug) {
        query.slug = req.query.slug
    }

    User.findById(req.payload.id).then(function(user) {
        if (!user) {
            return res.sendStatus(401);
        }

        Basic.find({slug: query.slug})
            .then(function(results){
                results[0].reviewChecked = req.body.basic.reviewChecked;

                console.log(results[0]);

                return results[0].save().then(function(review){
                    return res.json({review: review.toJSON()});
                }).catch(next);
            });
    });
});

// Get audio file
router.get('/getClip', auth.optional, function(req, res, next) {
    var query = {};

    if (req.query.clip) {
        query.clip = req.query.clip
    }

    // var way = path.resolve(".") + '/uploads/' + query.clip;

    var way = 'C:/xampp/htdocs/uploads/' + query.clip;

    return res.json({theClip: way}); // download function
});

// Download file
router.get('/download', auth.optional, function(req, res, next) {
    var query = {};

    if (req.query.file) {
        query.file = req.query.file
    }

    var way = path.resolve(".") + '/uploads/' + query.file;

    console.log(way);

    return res.download(way, query.file); // download function
});

module.exports = router;