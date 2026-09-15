Imports System.Data.SqlClient

Public Class frmAddUser

    Sub Fill()
        Try
            Dim cmd As New SqlCommand("Select Distinct FullName From Users", cnn)
            Dim Reader1 As SqlDataReader

            Me.ListBox1.Items.Clear()
            cnn.Open()
            Reader1 = cmd.ExecuteReader
            While Reader1.Read
                Me.ListBox1.Items.Add(Reader1.Item(0))
            End While
            cnn.Close()
        Catch ex As Exception
            MsgBox(ex.Message)
            Try
                cnn.Close()
            Catch

            End Try
        End Try
    End Sub

    Sub Clear()
        Me.txtFulNam.Clear()
        Me.txtPass.Clear()
        Me.txtUsrNam.Clear()
        Me.CombPriv.SelectedIndex = -1
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Try
            Dim cmd As New SqlCommand("insert into Users (FullName,UserName,PWD,Priv) " & _
                                      "values(N'" & Me.txtFulNam.Text & "',N'" & Me.txtUsrNam.Text & "',N'" & Me.txtPass.Text & _
                                      "',N'" & Me.CombPriv.SelectedItem & "')", con)
            con.Open()
            cmd.ExecuteNonQuery()
            con.Close()

            MsgBox("تم الحفظ")
            Clear()
            Fill()
        Catch ex As Exception
            MsgBox(ex.ToString)
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
        End Try
    End Sub

    Private Sub frmAddUser_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Fill()
    End Sub
End Class