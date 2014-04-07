var firebase = new Firebase('https://whobase.firebaseio.com');
var auth = new FirebaseSimpleLogin(firebase, firebaseAuth);
var currentUser = null;
var users = [];
var restrictDomain = 'firebase.com';

//setup templates
var templateUserListItem = Handlebars.compile($('#template-user-list-item').html());
var templateEditUser = Handlebars.compile($('#template-edit-user').html());
var templateUserDetail = Handlebars.compile($('#template-user-detail').html());

//setup
$(document).ready(function () {

    //setup links
    $('#signInLink').click(function () {
        doSignIn();
    });

    $('#signOutLink').click(function () {
        doSignOut();
    }).hide();

    $('#editLink').click(function () {
        doEdit();
    }).hide();
});

function doSignIn() {
    auth.login('google');
}

function doSignOut() {
    auth.logout();
}

function doEdit() {
    $('#editDiv').html(templateEditUser(currentUser));

    //wire the buttons
    $('#input_submit').click(function() {
        saveForm();

        showEdit(false);
        showList(true);

        return false;
    });

    $('#input_cancel').click(function() {
        showEdit(false);
        showList(true);

        return true;
    });


    showList(false);
    showEdit(true);
}

function saveForm() {
    var userRef = firebase.child(restrictDomain.replace('.','|')).child('users').child(currentUser.username);

    var displayName = $('#input_name').val();

    userRef.update({
        display_name: displayName,
        mobile_phone: $('#input_phone').val(),
        title: $('#input_title').val(),
        twitter_handle: $('#input_twitter').val(),
        start_date: $('#input_start').val(),
        location: $('#input_location').val(),
        setup_complete: true
    });
    userRef.setPriority(displayName);
}

function showSignedIn() {
    $('#signInLink').hide();
    $('#signOutLink').show();
    $('#editLink').show();
    $('#welcomeDiv').hide();
}

function showSignedOut() {
    $('#signOutLink').hide();
    $('#editLink').hide();
    $('#signInLink').show();
    $('#welcomeDiv').show();

    showEdit(false);
    showList(false);

    $('#users_table thead').html()
}

function showEdit(show) {
    if(show) {
        $('#editLink').addClass('active');
        $('#editDiv').show()
    } else {
        $('#editDiv').html();
        $('#editDiv').hide();
        $('#editLink').removeClass('active');
    }
}

function showList(show) {
    $('#listDiv').toggle(show);
    if(show) {
        $('#listDiv').show();
    }
}

function firebaseAuth(error, user) {
    if (error) {
        // an error occurred while attempting login
        showSignedOut();
        console.log(error);

    } else if (user) {
        if(user.email.substr(user.email.indexOf('@')) != '@' + restrictDomain) {
            doSignOut();
            return;
        }


        showSignedIn();

        var username = user.email.substr(0, user.email.indexOf('@'));

        //get data for this specific user
        var userRef = firebase.child(restrictDomain.replace('.','|')).child('users').child(username);
        userRef.once('value', function (snapshot) {
            if (snapshot.val() == null) {
                addUserToFirebase(userRef, username, user);
                doEdit();
            } else {
                currentUser = snapshot.val();
                //check that the picture hasn't changed
                if(snapshot.val().google_picture != user.picture) {
                    userRef.child("google_picture").set(user.picture);
//                    console.log('changed picture to '+ user.picture)
                }

                if (!snapshot.val().setup_complete) {
                    doEdit();
                } else {
                    showList(true);
                }

//                console.log('user ' + username + ' exists')
            }
        });

        //get the list of users
        var usersRef = firebase.child(restrictDomain.replace('.','|')).child('users');

        usersRef.on('child_added', function(snapshot) {
            users.push(snapshot.val());
//            console.log('got a user ' + snapshot.val().email);

            renderUserToTable(snapshot.val());
        });

        usersRef.on('child_changed', function(snapshot) {
            if(snapshot.val().username == currentUser.username) {
                currentUser = snapshot.val();
            }

            renderUserToTable(snapshot.val());
        });

        // user authenticated with Firebase
//        console.log('User ID: ' + user.id + ', Provider: ' + user.provider + ', Email: ' + user.email);
    } else {
        // user is logged out

        showSignedOut();
//        console.log('logged out')
    }
}

function addUserToFirebase(ref, username, authUser) {
    var whobaseUser = {
        "email": authUser.email,
        "family_name" : authUser.family_name,
        "given_name": authUser.given_name,
        "google_id": authUser.id,
        "display_name": authUser.displayName,
        "google_picture": authUser.picture,
        "username": username
    };

    currentUser = whobaseUser;

    ref.setWithPriority(whobaseUser, authUser.displayName)
}

function renderUserToTable(user) {
    if(!user.setup_complete) {
        return;
    }

    var existingItem = $('#__' + user.username);

    if(existingItem.length != 0) {
        existingItem.after(templateUserListItem(user));
        existingItem.remove();
    } else {
        $('#users_table tr:last').after(templateUserListItem(user));
    }

    $('#__' + user.username).click(function() {
//        console.log(user.username + ' clicked');

        if($('#__' + user.username).length != 0) {
            $('#userDetailDiv').slideUp();
            $('#userDetailTr').remove();
        }

        $('#__' + user.username).after(templateUserDetail(user));
        $('#userDetailDiv').slideDown();
    })
}
