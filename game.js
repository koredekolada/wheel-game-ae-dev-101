const contractSource = `
payable contract Wheel =   
    type i = int
    type s = string
    type a = address

    record player = {
        id : i,
        owner : a,
        name	  : s,
        amountWon	  : i }
   
    record state = 
        { players : map(i, player),
        totalPlayers : i}
 
    entrypoint init() = {
        players = {},
        totalPlayers = 0 }

    entrypoint getPlayer(index : i) : player = 
        switch(Map.lookup(index, state.players))
            None  => abort("There is no Player with that ID.")
            Some(x) => x  

    stateful entrypoint addPlayer(name' : s) = 
       
        let index = getTotalPlayers() + 1
        let player = {id= index,  owner  = Call.caller, name = name', amountWon = 0}
        put(state {players[index] = player, totalPlayers = index})

    entrypoint getTotalPlayers() : i = 
        state.totalPlayers

    entrypoint getContractBalance() = 

        Contract.balance

    stateful payable entrypoint pay(amount : i) =
        Chain.spend(Contract.address,amount)
        
    stateful payable entrypoint cashOut(amount : i) =
        Chain.spend(Call.caller,amount)
        
        
        
    payable stateful entrypoint play(index : i, prize : i) =
        let detail = getPlayer(index)
        Chain.spend(detail.owner, prize)
        let updatedPrize = detail.amountWon + prize
        let updatedDetails = state.players{ [index].amountWon = updatedPrize }
        put(state{ players = updatedDetails })

    `;

const contractAddress = "ct_2njiM6b5YX2RLPpGm6dPcPJSkiwFBwGogT2uMiDYhxb1i8cCEf";
var GamersArray = [];
var client = null;
var GameLength = 0;

// 
var totalAmount  = 0;

function renderGamers() {
  GamersArray = GamersArray.sort(function(a, b) {
    return b.amountWon - a.amountWon;
  });
  var template = $("#template").html();

  Mustache.parse(template);
  var rendered = Mustache.render(template, {
    GamersArray
  });

  $("#gamers").html(rendered);
}
//Create a asynchronous read call for our smart contract
async function callStatic(func, args) {
  //Create a new contract instance that we can interact with
  const contract = await client.getContractInstance(contractSource, {
    contractAddress
  });

  const calledGet = await contract
    .call(func, args, {
      callStatic: true
    })
    .catch(e => console.error(e));

  const decodedGet = await calledGet.decode().catch(e => console.error(e));
  console.log("number of posts : ", decodedGet);
  return decodedGet;
}

async function contractCall(func, args, value) {
  const contract = await client.getContractInstance(contractSource, {
    contractAddress
  });
  //Make a call to write smart contract func, with aeon value input
  const calledSet = await contract
    .call(func, args, {
      amount: value
    })
    .catch(e => console.error(e));

  return calledSet;
}

// the game itself
var game;


// the spinning wheel
var wheel;
// can the wheel spin?
var canSpin;
// slices (prizes) placed in the wheel
var slices = 8;
// prize names, starting from 12 o'clock going clockwise
var slicePrizes = [
  "A KEY!!!",
  "1 aettos",
  "5 STARS",
  "BAD LUCK!!!",
  "2 STARS",
  "3 STARS",
  "BAD LUCK!!!",
  "BAD LUCK!!!"
];
// the prize you are about to win
var prize;
// text field where to show the prize
var prizeText;



// PLAYGAME STATE

window.onload = async function() {
  $("#checkOut").hide();
  $(".loader1").show();
  console.log("Getting data from the blockchain")

  client = await Ae.Aepp();

  GamerLength = await callStatic("getTotalPlayers", []);

  for (let i = 1; i <= GamerLength; i++) {
    const persons = await callStatic("getPlayer", [i]);

    console.log("calling contract");

    GamersArray.push({
      id: persons.id,
      name: persons.name,
      owner: persons.owner,
      amountWon: persons.amountWon
    });

    //   renderProduct();
    //   $("#loading-bar-spinner").hide();
  }
  console.log("Finished!!");
  $(".loader1").hide();

  // await $(".fourth").click(async function(e) {
  //   console.log(" Register Button was Clicked");s
  //   const name = $("#user").val();
  //   console.log(name);
  //   await contractCall("addPlayer", [name], 0);
  //   console.log("Added User");
  //   $("#login").hide();
  //   $("#body").show();

  // });

  //
  // $("#gameSection").hide()

  $(".fourth").click(async function(e) {
    $(".loader1").show();
    console.log(" Register Button was Clicked");
    const name = $("#user").val();
    console.log(name);
    await contractCall("addPlayer", [name], 0);
    console.log("Added User");
    $("#login").hide();
    // $("#body").show();
    game = new Phaser.Game(458, 488, Phaser.AUTO, "");
    // adding "PlayGame" state
    game.state.add("PlayGame", playGame);
    // launching "PlayGame" state
    game.state.start("PlayGame");

    // $("#login").hide()

    $(".loader1").hide();
  });

  
  // creation of a 458x488 game
};

var playGame = function(game) {};

playGame.prototype = {
  // function to be executed once the state preloads
  preload: function() {
    // preloading graphic assets
    game.load.image("wheel", "wheel.png");
    game.load.image("pin", "pin.png");
  },
  // funtion to be executed when the state is created
  create: function() {
    $("#checkOut").show();
    // giving some color to background
    game.stage.backgroundColor = "#880044";
    // adding the wheel in the middle of the canvas
    wheel = game.add.sprite(game.width / 2, game.width / 2, "wheel");
    // setting wheel registration point in its center
    wheel.anchor.set(0.5);
    // adding the pin in the middle of the canvas
    var pin = game.add.sprite(game.width / 2, game.width / 2, "pin");
    // setting pin registration point in its center
    pin.anchor.set(0.5);
    // adding the text field
    prizeText = game.add.text(game.world.centerX, 480, "");
    // setting text field registration point in its center
    prizeText.anchor.set(0.5);
    // aligning the text to center
    prizeText.align = "center";
    // the game has just started = we can spin the wheel
    canSpin = true;
    // waiting for your input, then calling "spin" function
    game.input.onDown.add(this.spin, this);
  },

  // function to spin the wheel
  spin() {
    // can we spin the wheel?
    if (canSpin) {
      // resetting text field
      prizeText.text = "";
      // the wheel will spin round from 2 to 4 times. This is just coreography
      var rounds = game.rnd.between(2, 4);
      // then will rotate by a random number from 0 to 360 degrees. This is the actual spin
      var degrees = game.rnd.between(0, 360);
      // before the wheel ends spinning, we already know the prize according to "degrees" rotation and the number of slices
      prize = slices - 1 - Math.floor(degrees / (360 / slices));
      // now the wheel cannot spin because it's already spinning
      canSpin = false;
      // animation tweeen for the spin: duration 3s, will rotate by (360 * rounds + degrees) degrees
      // the quadratic easing will simulate friction
      var spinTween = game.add.tween(wheel).to(
        {
          angle: 360 * rounds + degrees
        },
        3000,
        Phaser.Easing.Quadratic.Out,
        true
      );
      // once the tween is completed, call winPrize function
      spinTween.onComplete.add(this.winPrize, this);
    }
  },

  // function to assign the prize
  async winPrize() {
    // now we can spin the wheel again
    canSpin = true;
    // writing the prize you just won

    console.log(slicePrizes[prize])
    prizeText.text = slicePrizes[prize];
    // console.log(prize);

if(slicePrizes[prize] ==  "BAD LUCK!!!" ){
  totalAmount = totalAmount - 1
  // totalAmount + prize
}else if(slicePrizes[prize] ==  "1 aettos"){
  totalAmount =  totalAmount + 1
}
else if(slicePrizes[prize] ==  "2 STARS"){
  totalAmount = totalAmount + 2
}
else if(slicePrizes[prize] ==  "3 STARS"){
  totalAmount = totalAmount + 3
}
else if(slicePrizes[prize] == "5 STARS"){
  totalAmount = totalAmount + 5
}
else{
  totalAmount = totalAmount + 1
}
    


console.log(
  "Current score : ", totalAmount
)

    // if (prize > 0) {
    //   $(".loader1").show();
    //   console.log("You just won ", prize, " aettos");
    //   await contractCall("payPlayer", [prize * 100000], prize * 100000);
    //   console.log("Paid Succefully");
    //   $(".loader1").hide();
    // } else {
    //   $(".loader1").show();
    //   await contractCall("pay", [100000], 100000);
    //   console.log("debitted looser");
    //   console.log("Try again");
    //   $(".loader1").hide();
    // }
  }
};

// // });
// async function clickSubmit(){
//   await

// }

$("#checkOut").click(async function(e) {
  $(".loader1").show();
  console.log(" CashOut button was Clicked");
  console.log( `paying out ${totalAmount * 100000}`)
  if(totalAmount > 0){
    console.log("cashing out")
    await contractCall("cashOut", [totalAmount * 100000], totalAmount* 100000);
    console.log("cashed out, page will reload")
    location.reload()
  }else if (totalAmount < 0){
    console.log("paying dues")
    await contractCall('pay', [totalAmount.abs() * 100000], totalAmount.abs()* 100000)
    console.log("cashed out, page will reload")
    location.reload()
  }
  else{
    console.log("You have nothing to cash out")
    location.reload()
  }


  $(".loader1").hide();
});
