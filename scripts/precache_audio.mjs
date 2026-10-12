import http from 'http';

const quotes = [
  "Cita de Ramesh Balsekar. Las cosas suceden, los acontecimientos tienen lugar, pero no hay un hacedor individual. Fuente: Diálogos en Bombay",
  "Cita de Ramesh Balsekar. No puedes apresurar el río de tu propio entendimiento. La comprensión llega cuando el momento cósmico es propicio. Fuente: El Dúo de Uno",
  "Cita de Ramesh Balsekar. La búsqueda espiritual comienza con el deseo del ego de ser inmortal, y termina cuando el ego se da cuenta de que nunca existió. Fuente: La Consciencia Habla",
  "Cita de Ramesh Balsekar. La aceptación de lo que Es en el momento presente es la única verdadera paz que un ser humano puede experimentar. Fuente: Paz y Armonía en la Vida Cotidiana",
  "Cita de Ramesh Balsekar. Si comprendes profundamente que nadie hace nada por su cuenta, ¿a quién vas a culpar? ¿De quién te vas a vengar? Fuente: Punteros de Sabiduría",
  "Cita de Ramesh Balsekar. El destino está escrito en la Totalidad. Tu único libre albedrío real es aceptar la danza o luchar inútilmente contra ella. Fuente: Deja Fluir la Vida",
  "Cita de Ramesh Balsekar. El buscador viene a preguntarme cómo matar al ego. Y yo respondo: ¿Quién quiere matar al ego sino el ego mismo jugando a ser espiritual? Fuente: Diálogos Matutinos en Mumbai",
  "Cita de Ramesh Balsekar. Cuando reconoces que no eres el hacedor, una inmensa ligereza desciende sobre el corazón: la carga de la culpa desaparece. Fuente: La Verdad Final",
  "Cita de Ramesh Balsekar. La mente dividida juzga, compara y sufre. La mente en descanso simplemente observa el juego con una sonrisa silenciosa. Fuente: El Espejo de la Consciencia",
  "Cita de Ramesh Balsekar. Toda acción sucede por la voluntad de la Totalidad, no por la de un individuo imaginario. Fuente: Deja Fluir la Vida (Let Life Flow)",
  "Cita de Ramesh Balsekar. No necesitas cambiarte a ti mismo, porque no hay un tú separado que pueda cambiarse. Lo que cambia es el funcionamiento de la Consciencia. Fuente: El Dúo de Uno",
  "Cita de Ramesh Balsekar. Si el orgullo entra por la puerta principal, la culpa ya está esperando en la puerta trasera. Ambas son las dos caras de la misma moneda: la autoría personal. Fuente: Diálogos en Bombay",
  "Cita de Ramesh Balsekar. La Consciencia es todo lo que hay. Todas las formas son olas en el mismo océano; ninguna ola puede mandar sobre el mar. Fuente: La Verdad Final",
  "Cita de Ramesh Balsekar. Vive tu vida normalmente: trabaja, cuida a tu familia, disfruta de la buena comida, pero sé consciente de que tú no eres quien mueve los hilos. Fuente: Paz y Armonía en la Vida Cotidiana",
  "Cita de Ramesh Balsekar. La iluminación es la aceptación total de lo que Es, en cada instante, sin reservas ni condiciones. Fuente: La Consciencia Habla"
];

async function warmOne(text) {
  const url = `http://localhost:3000/api/tts?text=${encodeURIComponent(text)}&format=mp3`;
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let bytes = 0;
      res.on('data', (c) => { bytes += c.length; });
      res.on('end', () => {
        console.log(`[Warm] ${res.statusCode} (${bytes} bytes): ${text.slice(0, 45)}...`);
        resolve();
      });
    }).on('error', (err) => {
      console.warn(`[Warm Error]: ${err.message}`);
      resolve();
    });
  });
}

async function main() {
  console.log(`Starting warming of ${quotes.length} quotes...`);
  for (const q of quotes) {
    await warmOne(q);
  }
  console.log('Finished warming audio cache.');
}

main();
