Imports System.Data.SqlClient

Public Class frmMainReg

    Private Sub إنشاءملفطالبطالبةToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmStudentProfiles
        a.Show()
    End Sub

    Private Sub تعديلبياناتملفطالبطالبةToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmStudentProfileUpdate
        a.Show()
    End Sub


    Private Sub تحويلطالبطالبةToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmTransferStudent
        a.Show()
    End Sub

    Private Sub كشفحسابطالبطالبةToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles كشفحسابطالبطالبةToolStripMenuItem.Click
        Dim a As New frmRptStudAccStatement
        a.Show()
    End Sub

    Private Sub كشفالطلابالمسجلينبالبرامجToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles كشفالطلابالمسجلينبالبرامجToolStripMenuItem.Click
        Dim a As New frmRptProgramsRegStudents
        a.Show()
    End Sub

    Private Sub كشفالطلابالمتأخرينعنالسدادبالبرامجToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles كشفالطلابالمتأخرينعنالسدادبالبرامجToolStripMenuItem.Click
        Dim a As New frmRptUnpaidList
        a.Show()
    End Sub

    Private Sub الرسومالدراسيةToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles الرسومالدراسيةToolStripMenuItem.Click
        Dim a As New frmTuitionFees
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem2.Click
        Dim a As New frmListBatches
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem1.Click
        Dim a As New frmAddPrograms
        a.Show()
    End Sub

    Private Sub ملفاتالطلابToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ملفاتالطلابToolStripMenuItem.Click
        Dim a As New frmStudentProfiles
        a.MdiParent = Me
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem3.Click
        Dim a As New frmStudentRegisteration
        a.MdiParent = Me
        a.Show()
    End Sub

    Private Sub frmMainReg_Load(sender As System.Object, e As System.EventArgs) Handles MyBase.Load

    End Sub

    Private Sub البياناتالشخصيةللطالبToolStripMenuItem_Click(sender As System.Object, e As System.EventArgs) Handles البياناتالشخصيةللطالبToolStripMenuItem.Click
        Dim a As New FrmForm
        a.MdiParent = Me
        a.Show()

    End Sub

    Private Sub الكشفالطبيToolStripMenuItem_Click(sender As System.Object, e As System.EventArgs) Handles الكشفالطبيToolStripMenuItem.Click
        
    End Sub

    Private Sub ادخالالبياناتToolStripMenuItem_Click(sender As System.Object, e As System.EventArgs) Handles ادخالالبياناتToolStripMenuItem.Click
        Dim a As New FrmMedical
        a.MdiParent = Me
        a.Show()
    End Sub

    Private Sub البحثعنالرقمالجامعيToolStripMenuItem_Click(sender As System.Object, e As System.EventArgs) Handles البحثعنالرقمالجامعيToolStripMenuItem.Click
        Dim a As New FrmSerchUNid
        a.Show()
    End Sub

    Private Sub تحويلطالبToolStripMenuItem_Click(sender As System.Object, e As System.EventArgs) Handles تحويلطالبToolStripMenuItem.Click
        Dim a As New frmTransferStudent
        a.ShowDialog()
    End Sub

    Private Sub تعديلملفطالبToolStripMenuItem_Click(sender As System.Object, e As System.EventArgs) Handles تعديلملفطالبToolStripMenuItem.Click
        Dim a As New frmStudentProfileUpdate
        a.ShowDialog()
    End Sub

    Private Sub ادخالبياناتالطلابToolStripMenuItem_Click(sender As System.Object, e As System.EventArgs) Handles ادخالبياناتالطلابToolStripMenuItem.Click
        Dim a As New FrmDataEntery
        a.Show()
    End Sub

    Private Sub حذفبياناتطالبToolStripMenuItem_Click(sender As System.Object, e As System.EventArgs) Handles حذفبياناتطالبToolStripMenuItem.Click
        Dim a As New frmdelet
        a.Show()
    End Sub

End Class