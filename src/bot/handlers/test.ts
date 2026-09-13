import { Context } from 'grammy';
import { saveTestResult, saveMessage } from '../../services/supabase';
import { getTestQuestionKeyboard, getTestResultKeyboard } from '../keyboards';

export const TEST_QUESTIONS = [
  "Спокій з'являється тільки тоді, коли 'все встигла'?",
  "Відпочинок треба заслужити або пояснити собі, чому зараз можна?",
  "Автоматично береш на себе більше, ніж повинна?",
  "Легше дати, ніж попросити чи прийняти підтримку?",
  "Боляче, коли твої зусилля не помітили або не оцінили?",
  "Страшно розслабитись, ніби тоді все почне сипатися?",
  "Після досягнень швидко стає мало: треба більше, краще, ще один рівень?"
];

// In-memory test sessions for simplicity and zero database churn per question
interface TestSession {
  index: number;
  score: number;
}
const userTestSessions = new Map<number, TestSession>();

export async function handleTestCallbacks(ctx: Context): Promise<boolean> {
  const data = ctx.callbackQuery?.data;
  if (!data || !ctx.from) return false;

  const userId = ctx.from.id;

  if (data === 'test_begin') {
    await ctx.answerCallbackQuery();
    userTestSessions.set(userId, { index: 0, score: 0 });
    await sendQuestion(ctx, userId, 0);
    return true;
  }

  if (data === 'test_yes' || data === 'test_no') {
    await ctx.answerCallbackQuery();
    const session = userTestSessions.get(userId);
    if (!session) {
      await ctx.reply('Тест було скинуто. Натисніть "Пройти тест" у меню.');
      return true;
    }

    if (data === 'test_yes') {
      session.score += 1;
    }
    session.index += 1;

    if (session.index < TEST_QUESTIONS.length) {
      await sendQuestion(ctx, userId, session.index);
    } else {
      // Test finished!
      const finalScore = session.score;
      userTestSessions.delete(userId);

      await saveTestResult(userId, finalScore);

      let resultText = `📊 <b>Результат тесту: ${finalScore} з 7 балів</b>\n\n`;
      if (finalScore >= 3) {
        resultText += 
          `⚠️ <b>Це серйозний сигнал.</b>\n` +
          `Твоя самооцінка та відчуття власної цінності все ще міцно прив'язані до корисності, результату, схвалення чи надмірних зусиль. Спокій приходить тільки тоді, коли все зроблено, а відпочинок відчувається як слабкість.\n\n` +
          `<b>Важливо:</b> З тобою абсолютно все гаразд. Свого часу ці патерни допомогли вижити. Але сьогодні вони забирають твою живість, енергію та обмежують розвиток.\n\n` +
          `Практикум <b>«Точка переходу»</b> розроблений саме для того, щоб екологічно вийти з цього замкнутого кола.`;
      } else {
        resultText += 
          `✅ <b>Гарний баланс.</b>\n` +
          `Здається, ти маєш відносно здоровий контакт зі своїми потребами та не схильна повністю розчинятися у справах. Проте, якщо ти відчуваєш фонове бажання змін або шукаєш нові життєві орієнтири, практикум допоможе знайти необхідну ясність.`;
      }

      try {
        await ctx.editMessageText(resultText, {
          parse_mode: 'HTML',
          reply_markup: getTestResultKeyboard()
        });
      } catch {
        await ctx.reply(resultText, {
          parse_mode: 'HTML',
          reply_markup: getTestResultKeyboard()
        });
      }
      await saveMessage(userId, 'bot', resultText);
    }
    return true;
  }

  return false;
}

async function sendQuestion(ctx: Context, userId: number, index: number) {
  const qText = `❓ <b>Питання ${index + 1}/7</b>\n\n<b>${TEST_QUESTIONS[index]}</b>`;
  try {
    await ctx.editMessageText(qText, {
      parse_mode: 'HTML',
      reply_markup: getTestQuestionKeyboard()
    });
  } catch {
    await ctx.reply(qText, {
      parse_mode: 'HTML',
      reply_markup: getTestQuestionKeyboard()
    });
  }
  await saveMessage(userId, 'bot', qText);
}
