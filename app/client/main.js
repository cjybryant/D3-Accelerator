import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import './main.html';

Template.hello.onCreated(function helloOnCreated() {
  // counter starts at 0
  this.counter = new ReactiveVar(0);
});

Template.hello.helpers({
  counter() {
    return Template.instance().counter.get();
  },
});

Template.hello.events({
  'click button'(event, instance) {
    // increment the counter when button is clicked
    instance.counter.set(instance.counter.get() + 1);
  },
});

Template.next.events({
  'click button'(event, instance) {
    var temp = document.getElementById("flipper");
    temp.className += " flipperClicked";
    alert(character)
    if (character == "seller"){
        document.getElementById("buyerInfo").style.display = "none";
    }else{
        document.getElementById("sellerInfo").style.display = "none";
    }

  },
});


Template.chooseCharacters.events({
  'click button'(event, instance) {
      document.getElementById("seller").setAttribute("class", "btn btn-default");
      document.getElementById("buyer").setAttribute("class", "btn btn-default");
      event.target.className = "btn btn-info";
      character = event.target.value;
  },
});