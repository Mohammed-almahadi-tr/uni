Public Class frmMainPanal

    Private Sub Button1_Click(sender As System.Object, e As System.EventArgs) Handles btnFinancialSystem.Click
        Dim a As New frmMainFin
        a.Show()
    End Sub

    Private Sub btnRegistrationSystem_Click(sender As System.Object, e As System.EventArgs) Handles btnRegistrationSystem.Click
        Dim a As New frmMainReg
        a.Show()
    End Sub
End Class