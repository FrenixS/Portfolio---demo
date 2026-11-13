let particles = [];
const num_particles = 80; // Mängd partiklar

// Inspirerat av Austins "Arrays" och "Bouncing balls" 
// I Austins exempel används pararella arrayer för att hålla koll på
// cirklarnas positon och hastighet individuellt. Vi har återanvänt detta kocept
// genom posX, posY, velX, velY, men vi har även lagt till accX och accY 
// för att kunna applicera en kraft på partiklarna (kraften kommer från micro:biten)

let posX = [];
let posY = [];
let velX = [];
let velY = [];
let accX = [];
let accY = [];
const maxSpeed = 6; // Maximal tillåten hastighet i normalt läge
const particleSize = 20;



// Variabler för Micro:bit-data
let microbitX = 0;
let microbitY = 0;
let microbitBtn = 0;
let prevBtn = 0; // Används för edge-detection (upptäcka när knapp nyss trycktes ned)
let isConnected = false; // Håller koll på om porten är ansluten


// Lista över tillgängliga färgpaletter (Både RGB och accent färger)
const palettes = [
  { name: "Cyber Cyan", primary: [0, 255, 200], accent: [255, 0, 150] },
  { name: "Acid Green", primary: [57, 255, 20], accent: [255, 255, 0] },
  { name: "Ultraviolence", primary: [180, 0, 255], accent: [0, 230, 255] },
  { name: "Solar Flare", primary: [100, 0, 100], accent: [255, 230, 0] }
];

// Index för den aktiva färgpaletten
let currentPaletteIndex = 0; 

// Tillståndshantering för show och glitch
let isShowActive = false;
let isGlitchMode = false;

function setup() {
  const canvas = createCanvas(800, 800);
  // Placerar p5.js-canvasen inuti HTML-elementet med ID:t "canvas-holder" som finns i index.html
  canvas.parent('canvas-holder');
 
  // Precis som i Austins "Bouncing ball" använder vi en for-loop för 
  // att fylla våra arrayer med startvärden
  for (let i = 0; i < num_particles; i++) {
    posX.push(random(width));
    posY.push(random(height));
    velX.push(random(-1, 1));
    velY.push(random(-1, 1));
    accX.push(0);
    accY.push(0);
  }

  // Försöker koppla till microbiten automatiskt 
autoConnectMicrobit();
}

function draw() {
  // Added for Radio
  if (!isShowActive) {
  background(0);
  drawHUD();
  return;
}

  handleButtonEvents(); //kontrollera om någon knapp har tryckts sen förra framen
  let activePalette = palettes[currentPaletteIndex]; //hämta inställningarna för nuvarande aktiva färgpalett
  
  // sätter bakgrunden beroende på ifall glitchmdoe är aktiverat
  if (isGlitchMode) {
    background(random(40), 0, random(80), 80); // Inverterad/strobbande bakgrundseffekt
  } else {
    background(0, 0, 0, 35); // Standard svarta bakgrund med motion-blur trail som skapas genom att sätta alfa på 35, 
  }

  // Omvandla Micro:bitens tilt (-1024 till 1024) till en enkel kraft, 1024 är max värde som microbiten kan ge
  let forceX = map(microbitX, -1024, 1024, 0.2, -0.2);
  let forceY = map(microbitY, -1024, 1024, 0.2, -0.2);
  //när glitchmode aktiveras mångdublas kraften vilket ger en mer kaotisk rörelse
  if (isGlitchMode) {
    forceX *= 4.0;
    forceY *= 4.0;
  }

  // I Austins "Loops" och "Bouncing ball" används for-looper i draw()
  // för att rita och uppdatera flera objekt samtidigt.
  // Vi har återanvänt denna ide för att uppdatera alla 80 partiklar
  for (let i = 0; i < num_particles; i++) {
    
    // Tar accelerations kraften från micro:biten och tilläger det på partiklarna
    accX[i] += forceX;
    accY[i] += forceY;

    // I "Bouncing ball" uppdateras positionen genom x[i] += speedX[i]
    // Vi har gjort om detta för att få acceleration -> hastighet -> position
    velX[i] += accX[i];
    velY[i] += accY[i];
    //lägger till slumpmässiga ryck hos partiklarna ifall glitchmdoe är aktiverat
    if (isGlitchMode) {
      velX[i] += random(-1.5, 1.5);
      velY[i] += random(-1.5, 1.5);
    } else {
      let currentSpeed = mag(velX[i], velY[i])

      // Skalar ned hastighetsvenkorn om hatigheten överstiger maxhastighet
      if (currentSpeed > maxSpeed) {
        velX[i] = (velX[i] / currentSpeed) * maxSpeed;
        velY[i] = (velY[i] / currentSpeed) * maxSpeed;
      }
    }

    //Uppdaterar positionen baserat på den beräknade hastigheten
    posX[i] += velX[i];
    posY[i] += velY[i];

    // återställer accelerationen till 0 inför nästa frame så att den inte ackumuleras oändligt,
    accX[i] = 0;
    accY[i] = 0;
    

    // I "Conditionals" och "Bouncing ball" visade Autsin if-satser som får bollarna att 
    // studsa när de nuddar kanten (speed *= -1). Vi har anpassat denna if-sats logik till en "warp"effekt. 
    // åker bollen ut på ena sidan flyttas den till andra sidan.
    if (posX[i] > width) posX[i] = 0;
    if (posX[i] < 0) posX[i] = width;
    if (posY[i] > height) posY[i] = 0;
    if (posY[i] < 0) posY[i] = height;
    //tar bort linjekontur på partiklarna
    fill(0, 255, 200);//sätter fyllnadsfärg
    ellipse(posX[i], posY[i], particleSize);//ritar formerna på cnavsen
    noStroke();
    //väljer slumpmässigt mellan primär och accent färg i glitchmode, annars används primärfärgen
    if (isGlitchMode && random() > 0.5) {
      fill(activePalette.accent[0], activePalette.accent[1], activePalette.accent[2]);
    } else {
      fill(activePalette.primary[0], activePalette.primary[1], activePalette.primary[2]);
    }

    // Variera storleken i glitch mode för visuell dynamik vid "drops"
    let currentSize = isGlitchMode ? particleSize * random(0.5, 2.2) : particleSize;
    ellipse(posX[i], posY[i], currentSize);

  }
 //ritar ut en liten joystick nere i vänstra hörn
 drawJoystick(100, height - 100, 50);
 //ritar ut hudgrännssnittet (text, kontrollinstruktioner)
 drawHUD();
}

function drawHUD() {
  push(); // spara aktuell stil och canvas inställning
  let activePalette = palettes[currentPaletteIndex];
  let p = activePalette.primary;

  textFont('sans-serif');
  fill(p[0], p[1], p[2], 220); // En färg för all text

  // Anslutningsstatus i övre vänstra hörnet
  textAlign(LEFT, TOP);
  textSize(14);
  if (isConnected) {
    text("● TRANSMITTER CONNECTED (USB)", 30, 30);
  } else {
    text("○ NOT CONNECTED — CLICK CANVAS TO PAIR TRANSMITTER", 30, 30);
  }

  // Kontrollinstruktioner i nedre högra hörnet
  textAlign(RIGHT, BOTTOM);
  textSize(15);
  text("CONTROLS", width - 30, height - 135);

  textSize(13);
  text("TRANSMITTER (USB)", width - 30, height - 110);
  text("Button A: Start show  |  Button B: Stop show", width - 30, height - 90);
  text("WAND (BATTERY)", width - 30, height - 70);
  text("Tilt: Move particles  |  Button A: Reset Particles", width - 30, height - 50);
  text("Button B: Switch Palette  |  Hold A+B: DROP / GLITCH MODE", width - 30, height - 30);

  // Indikator för nuvarande palett
  textSize(12);
  text("PALETTE: " + activePalette.name.toUpperCase(), width - 30, height - 10);

  // Väntläge-text i mitten
  if (!isShowActive) {
    textAlign(CENTER, CENTER);
    textSize(20);
    text("PRESS A ON TRANSMITTER TO START", width / 2, height / 2);
  }

  pop(); // Återställer tidigare stilinstlällningar
}

// Återställer alla partiklars positioner till mitten av canvas med nya hastigheter
function resetParticles() {
  for (let i = 0; i < num_particles; i++) {
    posX[i] = width / 2;
    posY[i] = height / 2;
    velX[i] = random(-3, 3);
    velY[i] = random(-3, 3);
  }
 }

function handleButtonEvents() {
  // Upptäck om knappens tillstånd har ändrats sedan den föregående framen
  if (microbitBtn !== prevBtn) {
    
    // Button A (1): Starta/Pausa canvas show eller återställ partiklar
    if (microbitBtn === 1) {
      resetParticles();
    }
    
    // Button B (2): Växla färgpalett (Cyber Cyan -> Acid Green -> Ultraviolence -> Solar Flare)
    if (microbitBtn === 2) {
      currentPaletteIndex = (currentPaletteIndex + 1) % palettes.length;
    }

    // Spara aktuellt knappläge
    prevBtn = microbitBtn;
  }

  // Knapp A+B samtidigt (3): Hålls A+B inne aktivieras Glitch/drop mode kontinuerligt
  isGlitchMode = (microbitBtn === 3);
}


// visuell joystick som viasr micro:bitens riktning
function drawJoystick(cx, cy, maxRadius) {
  push();
  translate(cx, cy); // flytta kodrinatsystemets origo till joystickens centrum
  
  // Rita yttre cirkelgräns för joysticken
  let p = palettes[currentPaletteIndex].primary;
  stroke(p[0], p[1], p[2], 200);
  strokeWeight(2);
  noFill();
  ellipse(0, 0, maxRadius * 2);

  // Skala om tiltvärdena (-1024 till 1024) till pixelförskjutning i joysticken
  let offsetX = map(microbitX, -1024, 1024, maxRadius, -maxRadius);
  let offsetY = map(microbitY, -1024, 1024, maxRadius, -maxRadius);

  // Skapa vektor och begränsa spakens utslag inom den yttre cirkeln
  let stick = createVector(offsetX, offsetY);
  stick.limit(maxRadius);

  let activePalette = palettes[currentPaletteIndex];
  
  // Rita linjen från centrum ut till joysticksknappen
  stroke(255, 0, 0, 180);
  strokeWeight(3);
  line(0, 0, stick.x, stick.y);

  // Rita själva joysticksknappen
  noStroke();
  fill(255, 0, 0);
  ellipse(stick.x, stick.y, 20);
  
  pop();
}

// Om användaren klickar på canvasen när Micro:bit inte är ansluten, öppnas parningsdialogen
function mousePressed() {
  if (!isConnected && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    connectMicrobit();
  }
}

// Försöker automatiskt ansluta till en Micro:bit om behörighet redan getts tidigare
async function autoConnectMicrobit() {
  if ("serial" in navigator) {
    const ports = await navigator.serial.getPorts();
    if (ports.length > 0) {
      try {
        const port = ports[0];
        await port.open({ baudRate: 115200 });
        isConnected = true;
        readLoop(port);
      } catch (err) {
        console.log("Kräver manuellt klick för anslutning:", err);
      }
    }
  }
}

// Öppnar webbläsarens dialog för att välja och ansluta till Micro:bit via USB/Seriell
async function connectMicrobit() {
  try {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    isConnected = true;
    readLoop(port);
  } catch (err) {
    console.log("Anslutning avbröts eller misslyckades:", err);
  }
}

// Async loop som kontinuerligt läser inkommande seriedata från Micro:bit
async function readLoop(port) {
  const reader = port.readable.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      isConnected = false;
      break;
    }

    // Avkoda binärdata till sträng och lägg till i databufferten
    buffer += decoder.decode(value);
    let lines = buffer.split("\n");
    buffer = lines.pop();

    // Gå igenom alla fullständiga mottagna rader
    for (let line of lines) {
      let msg = trim(line);
      if (msg === "START") { isShowActive = true; continue; }
      if (msg === "STOP") { isShowActive = false; continue; }
      let parts = split(trim(line), ','); // Dela upp raden vid kommatecken (förväntat format: X,Y,Knapp)
      if (parts.length === 3) {
        // Omvandla textvärdena till tal och uppdatera globala variabler
        microbitX = Number(parts[0]);
        microbitY = Number(parts[1]);
        microbitBtn = Number(parts[2]);
      }
    }
  }
}