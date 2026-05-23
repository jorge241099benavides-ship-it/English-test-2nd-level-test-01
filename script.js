// URL de tu Web App de Google Apps Script
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxON7v5c6apN175iWwr6dM9l4p0B9zhHvdbpsF4tBE_fjqvjKjrpQzuThIQdyKeTenM4A/exec";

let examActive = true;
const maxPoints = 100;

// RESTRICCIÓN: Cambio de pestañas o salida del navegador (Anti-trampas)
function handleCheating() {
    if (examActive) {
        examActive = false;
        document.body.innerHTML = `
            <div class="cheating-screen">
                <h1>EXAMEN BLOQUEADO / ANULADO</h1>
                <p><strong>Detección de copia:</strong> Has salido de la pestaña, cambiado de ventana o minimizado el navegador.</p>
                <p>Por motivos de seguridad y penalización, el examen ha quedado inhabilitado y no puedes continuar.</p>
            </div>`;
    }
}

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        handleCheating();
    }
});

window.addEventListener("blur", () => {
    handleCheating();
});

// BLOQUEO DE LA TECLA ENTER
document.getElementById('exam-form').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
    }
});

document.getElementById('exam-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const studentName = document.getElementById('student-name').value.trim();

    if (!studentName) {
        alert("¡ERROR! Debes escribir tu Nombre Completo antes de entregar el examen.");
        document.getElementById('student-name').focus();
        return;
    }

    if (!examActive) return;
    examActive = false; 

    let totalPoints = 0;
    let answersLog = [];
    let correctionHTML = "<h3>Correction Review / Revisión de Respuestas:</h3>";

    const questions = document.querySelectorAll('.question');

    // Función auxiliar: remueve signos de puntuación, apóstrofes y espacios dobles.
    // Esto hace que "wasn't" y "wasnt" sean evaluados igual contra la respuesta correcta.
    function normalizeText(str) {
        if (!str) return "";
        return str.toLowerCase()
                  .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
                  .replace(/\s+/g, " ")
                  .trim();
    }

    questions.forEach((q, index) => {
        const type = q.getAttribute('data-type');
        const points = parseInt(q.getAttribute('data-pts'));
        const correctAnsData = q.getAttribute('data-ans');
        
        let studentAns = "";
        let isCorrect = false;

        if (type === 'radio') {
            const checkedRadio = q.querySelector('input[type="radio"]:checked');
            studentAns = checkedRadio ? checkedRadio.value : "";
            
            // Permite múltiples opciones correctas (ej. a||c)
            const validOptions = correctAnsData.toLowerCase().split('||');
            if (validOptions.includes(studentAns.toLowerCase())) {
                isCorrect = true;
            }
        } else if (type === 'text') {
            const inputField = q.querySelector('input[type="text"]');
            studentAns = inputField ? inputField.value.trim() : "";
            
            const normStudent = normalizeText(studentAns);
            
            // Divide las variantes posibles por "||" y normaliza cada una
            const validOptions = correctAnsData.split('||').map(normalizeText);

            if (validOptions.includes(normStudent)) {
                isCorrect = true;
            }
        } else if (type === 'multitext') {
            const inputFields = q.querySelectorAll('input[type="text"]');
            const parts = correctAnsData.split('|'); // Mantenemos un solo pipe para multitexto
            let studentParts = [];
            let matchAll = true;

            inputFields.forEach((input, idx) => {
                const val = input.value.trim();
                studentParts.push(val);
                if (normalizeText(val) !== normalizeText(parts[idx])) {
                    matchAll = false;
                }
            });

            studentAns = studentParts.join(' | ');
            if (matchAll) {
                isCorrect = true;
            }
        }

        if (isCorrect) {
            totalPoints += points;
        }

        // Para mostrar solo la respuesta principal esperada y no confundir con los pipes
        const displayCorrect = correctAnsData.split('||')[0].replace('|', ' / ');

        answersLog.push({
            q_idx: index + 1,
            student: studentAns || "Sin responder",
            correct: displayCorrect,
            status: isCorrect ? "Correcta" : "Incorrecta"
        });

        correctionHTML += `
            <div class="feedback-item ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}">
                <p><strong>Item ${index + 1}:</strong> ${q.querySelector('p').innerText}</p>
                <p>Tu respuesta: <span class="${isCorrect ? 'text-correct' : 'text-incorrect'}">${studentAns || "No respondido"}</span></p>
                ${!isCorrect ? `<p style="color: #2b6cb0;">Respuesta esperada: ${displayCorrect}</p>` : ''}
            </div>
        `;
    });

    document.getElementById('exam-form').classList.add('hidden');
    document.getElementById('student-info').classList.add('hidden');
    
    document.getElementById('results-container').classList.remove('hidden');
    document.getElementById('student-name-display').innerText = `Student / Estudiante: ${studentName}`;
    document.getElementById('score-display').innerText = `Score / Puntaje: ${totalPoints} / ${maxPoints} Points`;
    document.getElementById('correction-display').innerHTML = correctionHTML;

    sendDataToSheets(studentName, totalPoints, answersLog);
});

function sendDataToSheets(name, score, answers) {
    const payload = {
        name: name,
        score: score,
        answers: answers
    };

    fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
    .then(() => console.log("Resultados enviados a Google Sheets correctamente."))
    .catch(error => console.error("Error al enviar datos:", error));
}
