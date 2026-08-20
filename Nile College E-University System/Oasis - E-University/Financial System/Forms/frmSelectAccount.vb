Imports System.Data.SqlClient

Public Class frmSelectAccount

    Sub Fill()
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim cmd As New SqlCommand("Select * From Acc1 Where Acc5 Like N'%" & Me.txtName.Text.Trim & "%' and Acc5 Is Not Null Order By Acc1,Acc2,Acc3,Acc4,Acc5", cnn)
            Dim Reader As SqlDataReader

            Me.ListAccounts.Items.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Dim Item As New ListViewItem
                Item.Text = Reader.Item("Acc1")
                Item.SubItems.Add(Reader.Item("Acc2"))
                Item.SubItems.Add(Reader.Item("Acc3"))
                Item.SubItems.Add(Reader.Item("Acc4"))
                Item.SubItems.Add(Reader.Item("Acc5"))

                Me.ListAccounts.Items.Add(Item)
            End While
            cnn.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Fill()
    End Sub

    Private Sub txtName_KeyUp(ByVal sender As System.Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtName.KeyUp
        If e.KeyCode = Keys.Enter Then
            Fill()
        End If
    End Sub

    Private Sub frmSelectAccount_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        SelAcc1 = ""
        SelAcc2 = ""
        SelAcc3 = ""
        SelAcc4 = ""
        SelAcc5 = ""
    End Sub

    Private Sub ListView1_DoubleClick(ByVal sender As Object, ByVal e As System.EventArgs) Handles ListAccounts.DoubleClick
        If Me.ListAccounts.SelectedItems.Count > 0 Then
            SelAcc1 = Me.ListAccounts.SelectedItems(0).Text
            SelAcc2 = Me.ListAccounts.SelectedItems(0).SubItems(1).Text
            SelAcc3 = Me.ListAccounts.SelectedItems(0).SubItems(2).Text
            SelAcc4 = Me.ListAccounts.SelectedItems(0).SubItems(3).Text
            SelAcc5 = Me.ListAccounts.SelectedItems(0).SubItems(4).Text

            Me.Close()
        End If
    End Sub

    Private Sub btnClose_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnClose.Click
        Me.Close()
    End Sub
End Class