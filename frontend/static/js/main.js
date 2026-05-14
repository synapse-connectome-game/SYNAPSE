/**
 * scene, game, UI, network graph
 */

import { NeuronScene }  from './scene.js';
import { Game }         from './game.js';
import { UI }           from './ui.js';
import { NetworkGraph } from './network.js';

async function bootstrap() {
  // fetch mesh manifest from backend
  let neuronManifest = [];
  try {
    const resp = await fetch('static/mesh-manifest.json');
    if (resp.ok) {
      const data  = await resp.json();
      neuronManifest = data.neurons ?? [];
      const nReal = neuronManifest.filter(m => m.available).length;
      console.info(`[manifest] ${nReal}/15 real OBJ meshes available`);
    }
  } catch { /* if server unreachable, neurons will use procedural geometry */ }

  // build Three.js scene
  const container = document.getElementById('canvas-container');
  const scene     = new NeuronScene(container);

  // populate neurons (real OBJs or procedural if not available)
  const meshLoaderFill  = document.getElementById('mesh-loader-fill');
  const meshLoaderLabel = document.getElementById('mesh-loader-label');
  const meshLoader      = document.getElementById('mesh-loader');
  const enterBtn        = document.getElementById('enter-btn');

  scene.addBackgroundNeurons();
  await scene.addForegroundNeurons(neuronManifest, (loaded, total) => {
    meshLoaderFill.style.width = `${(loaded / total) * 100}%`;
    meshLoaderLabel.textContent = 'Loading neuron meshes...';
    if (loaded === total) {
      setTimeout(() => {
        meshLoader.classList.add('hidden');
        enterBtn.classList.remove('hidden');
      }, 400);
    }
  });

  // UI + network graph
  const ui        = new UI();
  const netCanvas = document.getElementById('network-canvas');
  const network   = new NetworkGraph(netCanvas);

  // game
  let lastResults = null;
  const game = new Game(scene, ui, network, (results) => {
    lastResults = results;
    ui.showResults(results);
    showLaunchBar(); 
  });

  // keyboard input (synapse classification)
  document.addEventListener('keydown', e => {
    if (e.repeat) return;
    game.handleKey(e.key);
  });

  // mouse click (neuron identification)
  scene.setupNeuronClickHandler((label) => {
    game.handleNeuronClick(label);
  });

  const introScreen     = document.getElementById('intro-screen');
  const resultsScreen   = document.getElementById('results-screen');
  const startBtn        = document.getElementById('launch-start-btn');
  const countdownScreen = document.getElementById('countdown-screen');
  const countdownNum    = document.getElementById('countdown-number');

  function showIntro()    { introScreen.classList.remove('hidden'); }
  function hideIntro()    { introScreen.classList.add('hidden'); scene.enableAutoRotate(); }
  function showLaunchBar(){ startBtn.classList.remove('hidden'); }
  function hideLaunchBar(){ startBtn.classList.add('hidden'); }

  function startCountdown() {
    hideIntro();
    hideLaunchBar();
    resultsScreen.classList.add('hidden'); 
    countdownScreen.classList.remove('hidden');

    let count = 3;
    countdownNum.textContent = count;

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        countdownNum.textContent = count;
      } else {
        clearInterval(interval);
        countdownScreen.classList.add('hidden');
        game.start();
      }
    }, 1000);
  }

  // button handlers

  const closeIntroBtn = document.getElementById('close-intro-btn');

  // enter arrow
  enterBtn.addEventListener('click', hideIntro);

  // X button
  closeIntroBtn.addEventListener('click', () => {
    closeIntroBtn.classList.add('hidden');
    hideIntro();
  });

  // instructions button
  document.getElementById('instructions-btn').addEventListener('click', () => {
    meshLoader.classList.add('hidden');
    enterBtn.classList.add('hidden');
    closeIntroBtn.classList.remove('hidden');
    showIntro();
  });

  // start button
  document.getElementById('launch-start-btn').addEventListener('click', startCountdown);

  // network expand
  const connectomeModal     = document.getElementById('connectome-modal');
  const networkCanvasLarge  = document.getElementById('network-canvas-large');

  document.getElementById('expand-connectome-btn').addEventListener('click', () => {
    network.renderTo(networkCanvasLarge);
    connectomeModal.classList.remove('hidden');
  });

  document.getElementById('close-connectome-btn').addEventListener('click', () => {
    connectomeModal.classList.add('hidden');
  });

  // close network
  connectomeModal.addEventListener('click', (e) => {
    if (e.target === connectomeModal) connectomeModal.classList.add('hidden');
  });

  // close results card
  document.getElementById('close-results-btn').addEventListener('click', () => {
    document.getElementById('results-screen').classList.add('hidden');
    scene.enableAutoRotate();
    if (lastResults) ui.showPostGameSummary(lastResults);
  });
}

bootstrap().catch(console.error);
